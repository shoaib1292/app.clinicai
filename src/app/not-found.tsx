import { NotFoundPage } from "@/components/ui/not-found-page";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <NotFoundPage homeHref="/login" />
    </div>
  );
}
