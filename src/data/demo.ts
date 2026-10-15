import type { Category, Product } from "../types";

export const demoCategories: Category[] = [
  { id: "ebooks", name: "E-books", slug: "e-books", description: "Leitura prática para aprender no seu ritmo." },
  { id: "cursos", name: "Cursos", slug: "cursos", description: "Conhecimento aplicável, do começo ao próximo passo." },
  { id: "apostilas", name: "Apostilas", slug: "apostilas", description: "Conteúdo organizado para estudar com clareza." },
  { id: "planners", name: "Planners", slug: "planners", description: "Planejamento bonito que funciona na vida real." },
  { id: "kits", name: "Kits Digitais", slug: "kits-digitais", description: "Recursos completos para colocar seus planos em ação." },
];

const demoDate = "2026-01-01T00:00:00.000Z";
export const demoProducts: Product[] = [
  {
    id: "demo-ebook", title: "Ideias em Movimento", slug: "ideias-em-movimento",
    short_description: "Um guia leve e prático para transformar boas ideias em projetos reais.",
    description: "Um guia para organizar suas ideias, definir prioridades e começar com o que você já tem. Conteúdo demonstrativo.",
    category_id: "ebooks", price: 39.9, cover_url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=85",
    cover_alt: "Livro aberto sobre uma mesa clara", hotmart_url: null, featured: true, status: "published", created_at: demoDate,
  },
  {
    id: "demo-planner", title: "Planner Semana Leve", slug: "planner-semana-leve",
    short_description: "Organize compromissos, projetos e pausas em um só lugar.",
    description: "Um planner digital funcional para uma rotina mais intencional. Conteúdo demonstrativo.",
    category_id: "planners", price: 29.9, cover_url: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=900&q=85",
    cover_alt: "Caderno aberto com anotações e caneta", hotmart_url: null, featured: true, status: "published", created_at: demoDate,
  },
  {
    id: "demo-curso", title: "Conteúdo com Propósito", slug: "conteudo-com-proposito",
    short_description: "Aprenda a planejar conteúdos que conectam e ajudam de verdade.",
    description: "Aulas práticas sobre planejamento, consistência e comunicação digital. Conteúdo demonstrativo.",
    category_id: "cursos", price: 119, cover_url: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=85",
    cover_alt: "Equipe colaborando em uma mesa de trabalho", hotmart_url: null, featured: true, status: "published", created_at: demoDate,
  },
  {
    id: "demo-apostila", title: "Apostila de Estudos Criativos", slug: "apostila-estudos-criativos",
    short_description: "Exercícios e referências para aprender com mais intenção.",
    description: "Material de apoio para estruturar seus estudos e acompanhar a evolução. Conteúdo demonstrativo.",
    category_id: "apostilas", price: 24.9, cover_url: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=85",
    cover_alt: "Anotações em um caderno ao lado de uma xícara", hotmart_url: null, featured: false, status: "published", created_at: demoDate,
  },
  {
    id: "demo-kit", title: "Kit Marca em Ação", slug: "kit-marca-em-acao",
    short_description: "Modelos editáveis para apresentar sua marca com consistência.",
    description: "Um conjunto demonstrativo de recursos digitais para apoiar pequenos negócios.",
    category_id: "kits", price: 54.9, cover_url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=85",
    cover_alt: "Materiais de planejamento organizados sobre uma mesa", hotmart_url: null, featured: true, status: "published", created_at: demoDate,
  },
];
