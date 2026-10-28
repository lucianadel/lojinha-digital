import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { AdminLayout } from "./components/AdminLayout";
import { ProtectedAdmin } from "./components/ProtectedAdmin";
import { StoreLayout } from "./components/StoreLayout";
import { AdminKidsImport } from "./pages/AdminKidsImport";
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

export default function App() {
  return <AuthProvider><Routes>
    <Route element={<StoreLayout />}>
      <Route index element={<Home />} />
      <Route path="loja" element={<Store />} />
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
      {import.meta.env.DEV && <Route path="importar-kids" element={<AdminKidsImport />} />}
      <Route path="configuracoes" element={<AdminSettings />} />
    </Route></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider>;
}
