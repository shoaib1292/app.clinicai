/**
 * Convert numbers in text to Urdu script equivalents for proper TTS pronunciation.
 * The Humnava-v2 model pronounces Urdu script natively, but mispronounces digits.
 * e.g. "PKR 350" → "PKR تین سو پچاس"
 */

const ONES = ['', 'ایک', 'دو', 'تین', 'چار', 'پانچ', 'چھہ', 'سات', 'آٹھ', 'نو']
const TENS = ['', 'دس', 'بیس', 'تیس', 'چالیس', 'پچاس', 'ساٹھ', 'ستر', 'اسی', 'نوے']
const TEENS = ['دس', 'گیارہ', 'بارہ', 'تیرہ', 'چودہ', 'پندرہ', 'سولہ', 'سترہ', 'اٹھارہ', 'انیس']
const HUNDREDS = ['', 'ایک سو', 'دو سو', 'تین سو', 'چار سو', 'پانچ سو', 'چھہ سو', 'سات سو', 'آٹھ سو', 'نو سو']
const SCALES = ['', 'ہزار', 'لاکھ', 'کروڑ']

function numberToUrdu(num: number): string {
  if (num < 0) return `منفی ${numberToUrdu(Math.abs(num))}`
  if (num === 0) return 'صفر'
  if (num < 10) return ONES[num]
  if (num < 20) return TEENS[num - 10]
  if (num < 100) {
    const ten = Math.floor(num / 10)
    const one = num % 10
    return one === 0 ? TENS[ten] : `${TENS[ten]} ${ONES[one]}`
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100)
    const rest = num % 100
    const hPart = HUNDREDS[hundred]
    return rest === 0 ? hPart : `${hPart} ${numberToUrdu(rest)}`
  }
  if (num < 100000) {
    const thousand = Math.floor(num / 1000)
    const rest = num % 1000
    const tPart = `${numberToUrdu(thousand)} ہزار`
    return rest === 0 ? tPart : `${tPart} ${numberToUrdu(rest)}`
  }
  if (num < 10000000) {
    const lakh = Math.floor(num / 100000)
    const rest = num % 100000
    const lPart = `${numberToUrdu(lakh)} لاکھ`
    return rest === 0 ? lPart : `${lPart} ${numberToUrdu(rest)}`
  }
  const crore = Math.floor(num / 10000000)
  const rest = num % 10000000
  const cPart = `${numberToUrdu(crore)} کروڑ`
  return rest === 0 ? cPart : `${cPart} ${numberToUrdu(rest)}`
}

const NUMBER_REGEX = /\d+(\.\d+)?/g

export function convertNumbersToUrdu(text: string): string {
  return text.replace(NUMBER_REGEX, (match) => {
    const num = parseFloat(match)
    if (isNaN(num)) return match
    if (!Number.isInteger(num)) {
      const intPart = Math.floor(num)
      const decPart = Math.round((num - intPart) * 100)
      if (decPart === 0) return numberToUrdu(intPart)
      return `${numberToUrdu(intPart)} اعشاریہ ${numberToUrdu(decPart)}`
    }
    return numberToUrdu(num)
  })
}
