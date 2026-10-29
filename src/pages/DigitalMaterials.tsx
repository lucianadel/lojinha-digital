import {Link} from "react-router-dom";
import {ProductCatalog} from "../components/ProductCatalog";
import {usePageMeta} from "../hooks/usePageMeta";
export function DigitalMaterials(){
 usePageMeta("Materiais Digitais", "Compre, baixe e imprima atividades, planners, jogos e materiais de estudo.");
 return <><section className="public-container materials-banner"><span className="store-kicker">APRENDER · CRIAR · IMPRIMIR</span><h1>Materiais Digitais — Compre, Baixe e Imprima</h1><p>Atividades, desenhos para colorir, planners, jogos educativos e materiais de estudo. A coleção Lojinha Digital Kids também está aqui!</p><ol><li>Escolha seu material.</li><li>Pague pelo Mercado Pago nos produtos habilitados.</li><li>Após a confirmação, baixe o PDF ou abra para imprimir.</li></ol><p>A impressão é feita por você no navegador ou leitor de PDF. Os arquivos pagos têm acesso privado.</p><Link to="/compra/recuperar">Recuperar uma compra pelo e-mail</Link></section><ProductCatalog sector="digital_material" /></>;
}
