import { PersonalizedServices } from "../components/PersonalizedServices";
import { usePageMeta } from "../hooks/usePageMeta";

export function Personalized() {
  usePageMeta("Personalizados", "Criação de livros, e-books e músicas personalizadas da Vozyx Studio. Feito especialmente para você.");
  return <PersonalizedServices />;
}
