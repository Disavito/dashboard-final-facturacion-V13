export const COMPANY_ID = 1;
export const BRANCH_ID = 1;

export const INVOICING_API_BASE_URL = import.meta.env.VITE_INVOICING_API_BASE_URL;
export const INVOICING_API_AUTH_TOKEN = import.meta.env.VITE_INVOICING_API_AUTH_TOKEN;

export const DEFAULT_SERIE_BOLETA = 'B001';
export const DEFAULT_SERIE_FACTURA = 'F001';
export const DEFAULT_SERIE_NOTA_CREDITO_BOLETA = 'BC01';
export const DEFAULT_SERIE_NOTA_CREDITO_FACTURA = 'FC01';

export const DEFAULT_MONEDA = 'PEN';
export const DEFAULT_TIPO_OPERACION = '0101'; // Venta interna
export const DEFAULT_METODO_ENVIO = '1'; // Envío directo
export const DEFAULT_FORMA_PAGO = 'Contado';
export const DEFAULT_USUARIO_CREACION = 'dashboard-user';

export const IGV_PERCENTAGE = 18;

// --- NEW CONSTANTS FOR DEFAULT BOLETA ITEMS ---
export const DEFAULT_ITEM_CODE = 'P001';
export const DEFAULT_ITEM_DESCRIPTION = 'Servicio General';
export const DEFAULT_ITEM_UNIT = 'NIU';
export const DEFAULT_ITEM_UNIT_VALUE = 100.00;
export const DEFAULT_SUNAT_PRODUCT_CODE = '50121500'; // Código genérico para servicios

export const TIPO_AFECTACION_IGV = [
  { code: '10', name: 'Gravado - Operación Onerosa' },
  { code: '20', name: 'Exonerado - Operación Onerosa' },
  { code: '30', name: 'Inafecto - Operación Onerosa' },
  { code: '40', name: 'Exportación' },
];

export const TIPO_DOCUMENTO_CLIENTE = [
  { code: '1', name: 'DNI' },
  { code: '6', name: 'RUC' },
  { code: '4', name: 'Carnet de Extranjería' },
  { code: '7', name: 'Pasaporte' },
  { code: '0', name: 'Doc. Trib. No Dom. Sin RUC' },
];

export const CREDIT_NOTE_REASONS = [
    { code: '01', name: 'Anulación de la operación' },
    { code: '02', name: 'Anulación por error en el RUC' },
    { code: '03', name: 'Corrección por error en la descripción' },
    { code: '04', name: 'Descuento global' },
    { code: '05', name: 'Descuento por ítem' },
    { code: '06', name: 'Devolución total' },
    { code: '07', name: 'Devolución por ítem' },
    { code: '08', name: 'Bonificación' },
    { code: '09', name: 'Disminución en el valor' },
    { code: '10', name: 'Otros conceptos' },
    { code: '11', name: 'Ajustes de operaciones de exportación' },
    { code: '12', name: 'Ajustes afectos al IVAP' },
    { code: '13', name: 'Ajustes - montos y/o fechas de pago' },
];
