import "./digital-payments.css";
import { DigitalMaterials } from "./pages/DigitalMaterials";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { AdminLayout } from "./components/AdminLayout";
import { ProtectedAdmin } from "./components/ProtectedAdmin";
import { StoreLayout } from "./components/StoreLayout";
import { lazy, Suspense } from "react";
import { LoadingState } from "./components/StoreState";
import { AdminCategories } from "./pages/AdminCategories";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminLogin } from "./pages/AdminLogin";
import { AdminProductForm } from "./pages/AdminProductForm";
import { AdminProducts } from "./pages/AdminProducts";
import { AdminSettings } from "./pages/AdminSettings";
import { About, Contact, FAQ, Privacy, Terms } from "./pages/InfoPages";
import { Home } from "./pages/Home";
import { ProductDetail } from "./pages/ProductDetail";
import { Store } from "./pages/Store";
import { Personalized } from "./pages/Personalized";

const DigitalCheckout = lazy(() => import("./pages/DigitalCheckout").then(m=>({default:m.DigitalCheckout})));
const DigitalReceipt = lazy(() => import("./pages/DigitalReceipt").then(m=>({default:m.DigitalReceipt})));
const DigitalRecovery = lazy(() => import("./pages/DigitalRecovery").then(m=>({default:m.DigitalRecovery})));
const AdminDigital = lazy(() => import("./pages/AdminDigital").then(m=>({default:m.AdminDigital})));
const AdminKidsImport = lazy(() => import("./pages/AdminKidsImport").then(module => ({ default: module.AdminKidsImport })));

export default function App() {
  return <AuthProvider><Routes>
    <Route element={<StoreLayout />}>
      <Route index element={<Home />} />
      <Route path="materiais-digitais" element={<DigitalMaterials />} />
      <Route path="loja" element={<Store />} />
      <Route path="compra/resultado" element={<Suspense fallback={<LoadingState/>}><DigitalReceipt/></Suspense>} />
      <Route path="compra/recuperar" element={<Suspense fallback={<LoadingState/>}><DigitalRecovery/></Suspense>} />
      <Route path="compra/:slug" element={<Suspense fallback={<LoadingState/>}><DigitalCheckout/></Suspense>} />
      <Route path="personalizados" element={<Personalized />} />
      <Route path="produto/:slug" element={<ProductDetail />} />
      <Route path="sobre" element={<About />} />
      <Route path="contato" element={<Contact />} />
      <Route path="faq" element={<FAQ />} />
      <Route path="privacidade" element={<Privacy />} />
      <Route path="termos" element={<Terms />} />
    </Route>
    <Route path="admin/login" element={<AdminLogin />} />
    <Route element={<ProtectedAdmin />}><Route path="admin" element={<AdminLayout />}>
      <Route index element={<AdminDashboard />} />
      <Route path="produtos" element={<AdminProducts />} />
      <Route path="produtos/novo" element={<AdminProductForm />} />
      <Route path="produtos/:id" element={<AdminProductForm />} />
      <Route path="categorias" element={<AdminCategories />} />
      <Route path="materiais-digitais" element={<Suspense fallback={<LoadingState/>}><AdminDigital/></Suspense>} />
      <Route path="importar-kids" element={<Suspense fallback={<LoadingState label="Carregando importador..." />}><AdminKidsImport /></Suspense>} />
      <Route path="configuracoes" element={<AdminSettings />} />
    </Route></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider>;
}
