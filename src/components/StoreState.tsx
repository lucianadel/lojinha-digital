import { AlertCircle, LoaderCircle, SearchX } from "lucide-react";

export function LoadingState({ label = "Carregando conteúdo..." }: { label?: string }) {
  return <div className="state-card" role="status"><LoaderCircle className="spin" size={24} /><span>{label}</span></div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="state-card state-error" role="alert"><AlertCircle size={24} /><span>{message}</span>{onRetry && <button className="text-button" onClick={onRetry}>Tentar novamente</button>}</div>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="state-card"><SearchX size={25} /><div><strong>{title}</strong><p>{text}</p></div></div>;
}
