import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import AuthPage from './pages/Auth';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Page Imports
import DashboardPage from './pages/Dashboard';
import SociosPage from './pages/People';
import EditSocioPage from './pages/EditSocioPage';
import InvoicingLayout from './pages/invoicing/InvoicingLayout';
import BoletasPage from './pages/invoicing/BoletasPage';
import ResumenDiarioPage from './pages/invoicing/ResumenDiarioPage';
import NotasCreditoPage from './pages/invoicing/NotasCreditoPage';
import IngresosPage from './pages/Income';
import EgresosPage from './pages/Expenses';
import CuentasPage from './pages/Accounts';
import AccountDetails from './pages/AccountDetails';
import PartnerDocuments from './pages/PartnerDocuments';
import SettingsPage from './pages/Settings';

function App() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Routes>
        {/* Ruta Pública: Cualquiera puede acceder a la página de autenticación */}
        <Route path="/auth" element={<AuthPage />} />

        {/* Rutas Protegidas: El contenedor principal verifica el acceso al dashboard ('/') */}
        <Route element={<ProtectedRoute resourcePath="/" />}>
          <Route element={<DashboardLayout />}>
            {/* Dashboard es accesible si se tiene permiso para '/' */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Proteger cada sección con su respectivo resourcePath */}
            <Route element={<ProtectedRoute resourcePath="/people" />}>
              <Route path="people" element={<SociosPage />} />
              <Route path="people/:id" element={<EditSocioPage />} />
            </Route>
            
            <Route element={<ProtectedRoute resourcePath="/partner-documents" />}>
              <Route path="partner-documents" element={<PartnerDocuments />} />
            </Route>

            <Route element={<ProtectedRoute resourcePath="/invoicing" />}>
              <Route path="invoicing" element={<InvoicingLayout />}>
                <Route index element={<Navigate to="boletas" replace />} />
                <Route path="boletas" element={<BoletasPage />} />
                <Route path="resumen-diario" element={<ResumenDiarioPage />} />
                <Route path="notas-credito" element={<NotasCreditoPage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute resourcePath="/income" />}>
              <Route path="income" element={<IngresosPage />} />
            </Route>

            <Route element={<ProtectedRoute resourcePath="/expenses" />}>
              <Route path="expenses" element={<EgresosPage />} />
            </Route>

            <Route element={<ProtectedRoute resourcePath="/accounts" />}>
              <Route path="accounts" element={<CuentasPage />} />
              <Route path="accounts/:id" element={<AccountDetails />} />
            </Route>
            
            <Route element={<ProtectedRoute resourcePath="/settings" />}>
              <Route path="settings" element={<SettingsPage />} />
            </Route>

          </Route>
        </Route>
      </Routes>
    </div>
  );
}

export default App;
