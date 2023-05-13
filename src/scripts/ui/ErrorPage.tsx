import { ReactNode } from "react";

export function ErrorPage({ content }: { content: ReactNode }) {
   return <div className="error-page">{content}</div>;
}