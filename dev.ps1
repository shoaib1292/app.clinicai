<#
.SYNOPSIS
  ClinicAI -- One-command dev launcher
  NORMAL:     .\dev.ps1
  FIRST TIME: .\dev.ps1 -Setup
  STOP:       .\dev.ps1 -Stop
  NO TUNNEL:  .\dev.ps1 -NoTunnel
  NO DB CHK:  .\dev.ps1 -NoDB
#>
param(
  [switch]$Setup,
  [switch]$Stop,
  [switch]$NoDB,
  [switch]$NoTunnel
)

$ROOT       = $PSScriptRoot
$DB_USER    = "clinicsai"
$DB_PASS    = "changeme"
$DB_NAME    = "clinicsai"
$DB_PORT    = 5433
$REDIS_PASS = "changeme"
$REDIS_PORT = 6379
$APP_PORT   = 8000
$LANDING_PT = 3000
$REALTIME_P = 3003
$REDIS_BIN  = "$env:USERPROFILE\redis\Redis-8.8.0-Windows-x64-msys2"
$REDIS_CONF = "$ROOT\scripts\redis.conf"
$PG_DATA    = "$ROOT\.pgsql\data"
$PG_LOG     = "$ROOT\.pgsql\pg.log"
$TUNNEL_NM  = "clinicai-dev"
$DOMAIN     = "clinicai.pk"
$APP_DOM    = "app.clinicai.pk"

function W-OK($m)   { Write-Host "[OK]    $m" -ForegroundColor Green }
function W-INF($m)  { Write-Host "[INFO]  $m" -ForegroundColor Cyan }
function W-WRN($m)  { Write-Host "[WARN]  $m" -ForegroundColor Yellow }
function W-ERR($m)  { Write-Host "[ERR]   $m" -ForegroundColor Red }
function W-HEAD($m) { Write-Host ""; Write-Host "===== $m =====" -ForegroundColor Magenta }

function Test-Port($h, $p) {
  try { $t = New-Object System.Net.Sockets.TcpClient; $t.Connect($h,$p); $t.Close(); return $true }
  catch { return $false }
}

function Find-PGBin {
  $cands = @(
    "$ROOT\node_modules\@embedded-postgres\windows-x64\native\bin"
    "C:\Program Files\PostgreSQL\18\bin"
    "C:\Program Files\PostgreSQL\17\bin"
    "C:\Program Files\PostgreSQL\16\bin"
    "C:\Program Files\PostgreSQL\15\bin"
  )
  $found = Get-ChildItem "$ROOT\node_modules\@embedded-postgres" -Recurse -Filter "pg_ctl.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) { $cands += Split-Path $found.FullName }
  foreach ($c in $cands) { if ($c -and (Test-Path "$c\pg_ctl.exe")) { return $c } }
  return $null
}

function Kill-StaleApps {
  Get-Process -Name "node","tsx" -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  }
}

# ---- STOP MODE ----
if ($Stop) {
  $env:NODE_ENV = "development"
  W-HEAD "Stopping ClinicAI"
  Kill-StaleApps
  Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | ForEach-Object {
    W-INF "Killing cloudflared PID $($_.Id)"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  }
  $rc = "$REDIS_BIN\redis-cli.exe"
  if (Test-Path $rc) { & $rc -a $REDIS_PASS --no-auth-warning SHUTDOWN NOSAVE 2>$null }
  W-OK "Done. Run .\dev.ps1 to restart."
  exit 0
}

# ---- Clean stale app processes before starting ----
Kill-StaleApps

# ---- SETUP MODE ----
if ($Setup) {
  W-HEAD "First-Time Setup"
  W-INF "Step 1: Cloudflare login (browser open hoga)"
  cloudflared login
  if ($LASTEXITCODE -ne 0) { W-ERR "Login failed!"; exit 1 }
  W-OK "Login OK"

  W-INF "Step 2: Create tunnel $TUNNEL_NM"
  $ex = cloudflared tunnel list 2>&1 | Select-String $TUNNEL_NM
  if (-not $ex) {
    cloudflared tunnel create $TUNNEL_NM
    if ($LASTEXITCODE -ne 0) { W-ERR "Tunnel create failed!"; exit 1 }
  } else { W-WRN "Tunnel already exists, skipping" }

  $info = cloudflared tunnel info $TUNNEL_NM 2>&1
  $tid = ($info | Select-String "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" |
    Select-Object -First 1).Matches[0].Value
  if (-not $tid) { W-ERR "Could not get tunnel ID"; exit 1 }
  W-INF "Tunnel ID: $tid"

  W-INF "Step 3: DNS routes"
  cloudflared tunnel route dns $TUNNEL_NM $DOMAIN 2>&1
  cloudflared tunnel route dns $TUNNEL_NM $APP_DOM 2>&1
  cloudflared tunnel route dns $TUNNEL_NM "*.$DOMAIN" 2>&1
  W-OK "DNS routes added (including wildcard *.$DOMAIN)"

  $cfDir = "$env:USERPROFILE\.cloudflared"
  New-Item -ItemType Directory -Force -Path $cfDir | Out-Null
  $cfConfig = @"
tunnel: $tid
credentials-file: $cfDir\$tid.json

ingress:
  - hostname: $APP_DOM
    service: http://localhost:$APP_PORT
  - hostname: $DOMAIN
    service: http://localhost:$LANDING_PT
  - hostname: "*.$DOMAIN"
    service: http://localhost:$APP_PORT
  - service: http_status:404
"@
  $cfConfig | Out-File -FilePath "$cfDir\config.yml" -Encoding UTF8
  W-OK "Config saved: $cfDir\config.yml"
  W-OK ""
  W-OK "SETUP DONE! Now run: .\dev.ps1"
  exit 0
}

# ---- Update Cloudflare Config for Ports ----
$cfDir = "$env:USERPROFILE\.cloudflared"
$cfg   = "$cfDir\config.yml"
if (Test-Path $cfg) {
  $rawCfg = Get-Content $cfg -Raw
  if ($rawCfg -match "credentials-file:\s*([^\s]+)") {
    $credFile = $matches[1]
    $tid = [System.IO.Path]::GetFileNameWithoutExtension($credFile)
    $cfConfig = @"
tunnel: $tid
credentials-file: $credFile

ingress:
  - hostname: $APP_DOM
    service: http://localhost:$APP_PORT
  - hostname: $DOMAIN
    service: http://localhost:$LANDING_PT
  - hostname: "*.$DOMAIN"
    service: http://localhost:$APP_PORT
  - service: http_status:404
"@
    $cfConfig | Out-File -FilePath $cfg -Encoding UTF8
  }
}

# ---- STEP 1: PostgreSQL ----
if (-not $NoDB) {
  W-HEAD "PostgreSQL (port $DB_PORT)"
  if (Test-Port "127.0.0.1" $DB_PORT) {
    W-OK "PostgreSQL already running"
  } else {
    W-INF "PostgreSQL not running, trying to start..."
    $pgBin = Find-PGBin
    if ($pgBin) {
      W-INF "Found PG bin: $pgBin"
      $libDir = Join-Path (Split-Path (Split-Path $pgBin)) "lib"
      $env:PGLIB = $libDir
      if (-not (Test-Path "$PG_DATA\PG_VERSION")) {
        W-INF "Initializing PostgreSQL data dir..."
        New-Item -ItemType Directory -Force -Path $PG_DATA | Out-Null
        & "$pgBin\initdb.exe" -D $PG_DATA -U $DB_USER --encoding=UTF8 --locale=C --no-instructions
        if ($LASTEXITCODE -ne 0) { W-ERR "initdb failed!"; exit 1 }
      }
      & "$pgBin\pg_ctl.exe" start -D $PG_DATA -l $PG_LOG -o "-p $DB_PORT -h 127.0.0.1"
      $t = 0
      while (-not (Test-Port "127.0.0.1" $DB_PORT) -and $t -lt 30) { Start-Sleep -Milliseconds 500; $t++ }
      if (Test-Port "127.0.0.1" $DB_PORT) {
        W-OK "PostgreSQL started"
        $env:PGPASSWORD = $DB_PASS
        & "$pgBin\psql.exe" -h 127.0.0.1 -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>$null
      } else {
        W-ERR "PostgreSQL failed to start. Log: $PG_LOG"
        exit 1
      }
    } else {
      W-ERR "No PostgreSQL binaries found!"
      W-WRN "Install PostgreSQL: https://www.postgresql.org/download/windows/"
      W-WRN "Or: scoop install postgresql"
      exit 1
    }
  }
}

# ---- STEP 2: Redis ----
if (-not $NoDB) {
  W-HEAD "Redis (port $REDIS_PORT)"
  $rcli = "$REDIS_BIN\redis-cli.exe"
  $rsrv = "$REDIS_BIN\redis-server.exe"
  if (Test-Port "127.0.0.1" $REDIS_PORT) {
    W-OK "Redis already running"
  } else {
    if (-not (Test-Path $rsrv)) {
      W-WRN "Redis not found at: $rsrv"
      W-WRN "Redis is optional with STORE_TYPE=memory - continuing without it..."
    } else {
      $rd = "$ROOT\.redis"
      New-Item -ItemType Directory -Force -Path $rd | Out-Null
      $redisConfPath = "$rd\redis.conf"
      $rdUnix = $rd.Replace('\', '/')
      $redisConfContent = @"
port $REDIS_PORT
requirepass $REDIS_PASS
appendonly yes
appendfsync everysec
save 300 1
maxmemory 2gb
maxmemory-policy allkeys-lru
logfile ""
dir "$rdUnix"
"@
      $redisConfContent | Out-File -FilePath $redisConfPath -Encoding ASCII
      $redisArg = "`"$redisConfPath`""
      Start-Process -FilePath $rsrv -ArgumentList $redisArg -WindowStyle Hidden
      $t = 0
      while ($t -lt 20) {
        Start-Sleep -Milliseconds 500
        $p = & $rcli -a $REDIS_PASS --no-auth-warning PING 2>$null
        if ($p -eq "PONG") { W-OK "Redis started!"; break }
        $t++
      }
      if (-not (Test-Port "127.0.0.1" $REDIS_PORT)) { W-WRN "Redis failed to start (optional with STORE_TYPE=memory)" }
    }
  }
}

# ---- STEP 3: Prisma ----
W-HEAD "Prisma"
$env:DATABASE_URL = "postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:${DB_PORT}/${DB_NAME}"
W-INF "prisma generate..."
node node_modules/prisma/build/index.js generate 2>&1 | Where-Object { $_ -notmatch "^Tip:|^hint:" } | ForEach-Object { Write-Host $_ }
W-INF "prisma migrate deploy..."
node node_modules/prisma/build/index.js migrate deploy 2>&1 | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) {
  W-WRN "migrate deploy failed, trying db push..."
  node node_modules/prisma/build/index.js db push 2>&1 | ForEach-Object { Write-Host $_ }
}
W-OK "Prisma done!"

# ---- STEP 3.5: LiveKit Server (telemedicine) ----
W-HEAD "LiveKit Server (port 7880)"
$livekitBin = "C:\tools\livekit\livekit-server.exe"
if (Test-Port "127.0.0.1" 7880) {
  W-OK "LiveKit already running on port 7880"
} elseif (Test-Path $livekitBin) {
  W-INF "Starting LiveKit server..."
  Start-Process -FilePath $livekitBin -ArgumentList "--dev","--bind","0.0.0.0" -WindowStyle Hidden
  $t = 0
  while (-not (Test-Port "127.0.0.1" 7880) -and $t -lt 15) { Start-Sleep -Milliseconds 500; $t++ }
  if (Test-Port "127.0.0.1" 7880) {
    W-OK "LiveKit started on port 7880"
  } else {
    W-WRN "LiveKit may still be starting (port 7880 not responding yet)"
  }
} else {
  W-WRN "LiveKit binary not found at $livekitBin"
}

# ---- STEP 4: Cloudflare Tunnel ----
if (-not $NoTunnel) {
  W-HEAD "Cloudflare Tunnel"
  $cert = "$env:USERPROFILE\.cloudflared\cert.pem"
  $cfg  = "$env:USERPROFILE\.cloudflared\config.yml"
  if (-not (Test-Path $cert)) {
    W-WRN "No cert.pem found. Run: .\dev.ps1 -Setup"
    W-WRN "Skipping tunnel..."
  } elseif (-not (Test-Path $cfg)) {
    W-WRN "No config.yml. Run: .\dev.ps1 -Setup"
  } else {
    W-INF "Starting tunnel (background)..."
    $j = Start-Job -ScriptBlock {
      param($nm,$cfg)
      cloudflared tunnel --config $cfg run $nm 2>&1
    } -ArgumentList $TUNNEL_NM, $cfg
    Start-Sleep -Seconds 4
    if ($j.State -eq "Running") {
      W-OK "Tunnel running!"
      W-OK "  https://$DOMAIN    -> localhost:$LANDING_PT (Landing)"
      W-OK "  https://$APP_DOM   -> localhost:$APP_PORT (App Dashboard)"
    } else {
      W-WRN "Tunnel status:"
      Receive-Job $j | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    }
  }
}

# ---- STEP 5: Start Services ----
W-HEAD "Starting All Services"
W-INF "  Landing Site: http://localhost:$LANDING_PT  (Points to $DOMAIN)"
W-INF "  Main App:     http://localhost:$APP_PORT  (Points to $APP_DOM)"
W-INF "  Login:        http://localhost:$APP_PORT/login"
W-INF "  Password:     ClinicAI@2026"
Write-Host ""
W-WRN "Press Ctrl+C to stop all services"
Write-Host ""

node node_modules/concurrently/dist/bin/index.js `
  --kill-others-on-fail `
  --prefix-colors "cyan,green,yellow,blue" `
  -n "next,realtime,worker,landing" `
  "node node_modules/next/dist/bin/next dev -p $APP_PORT" `
  "node node_modules/tsx/dist/cli.mjs mini-services/realtime/index.ts" `
  "node node_modules/tsx/dist/cli.mjs worker/index.ts" `
  "node clinicai-landing/node_modules/next/dist/bin/next dev clinicai-landing -p $LANDING_PT"
