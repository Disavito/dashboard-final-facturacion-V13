import axios from 'axios';
import { z } from 'zod';
import { BRANCH_ID, COMPANY_ID, INVOICING_API_BASE_URL, INVOICING_API_AUTH_TOKEN } from '../constants';
import { BoletaPayload, CheckSummaryStatusResponseSchema, Client, CreateSummaryResponse, CreateSummaryResponseSchema, DailySummary, DocumentoAfectado, InvoicingCalendarItem, IssueResponse, IssueResponseSchema, NotaCreditoPayload, SendSummaryData, SendSummaryResponse, SendSummaryResponseSchema, DetalleBoletaSchema } from '../types/invoicing';
import { supabase } from '../supabaseClient';
import { TablesInsert } from '../database.types';

const invoicingApi = axios.create({
  baseURL: INVOICING_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${INVOICING_API_AUTH_TOKEN}`,
  },
});

/**
 * Emite una Boleta de Venta Electrónica.
 */
export const issueBoleta = async (boletaData: BoletaPayload): Promise<IssueResponse> => {
  try {
    const response = await invoicingApi.post('/boletas', boletaData);
    const validatedResponse = IssueResponseSchema.parse(response.data);
    return validatedResponse;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error al emitir boleta:", error.response.data);
      const apiMessage = error.response.data.message || JSON.stringify(error.response.data);
      throw new Error(`Error de la API de facturación: ${apiMessage}`);
    }
    if (error instanceof Error) {
        throw new Error(`Error al procesar la respuesta o de red: ${error.message}`);
    }
    throw new Error('Error desconocido al emitir la boleta.');
  }
};

/**
 * Genera el PDF de una Boleta de Venta Electrónica.
 */
export const generateBoletaPdf = async (boletaId: number, format: 'A4' | 'TICKET' = 'A4'): Promise<void> => {
  try {
    await invoicingApi.post(`/boletas/${boletaId}/generate-pdf`, { format });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error al generar PDF de boleta:", error.response.data);
      const apiMessage = error.response.data.message || JSON.stringify(error.response.data);
      throw new Error(`Error de la API al generar PDF: ${apiMessage}`);
    }
    throw new Error('Error desconocido al solicitar la generación del PDF.');
  }
};

/**
 * Downloads a Boleta PDF from the API and saves it to Supabase Storage.
 * This function does NOT trigger a browser download.
 */
export const saveBoletaPdfToSupabase = async (boletaId: number, serieCorrelativo: string, socioId: number, format: 'A4' | 'TICKET' = 'A4'): Promise<void> => {
  try {
    // 1. Obtener el PDF como blob
    const response = await invoicingApi.get(`/boletas/${boletaId}/download-pdf`, {
      params: { format },
      responseType: 'blob',
    });

    const pdfBlob = response.data;
    const fileName = `${serieCorrelativo}.pdf`;
    const filePath = `${socioId}/${fileName}`;
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // 2. Subir el archivo a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('comprobante-de-pago')
      .upload(filePath, pdfFile, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error("Error al subir el comprobante a Supabase Storage:", uploadError);
      throw new Error(`Error al guardar en Storage: ${uploadError.message}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error al obtener PDF de boleta para guardar:", error.response.data);
      throw new Error(`Error de la API al obtener PDF. Código: ${error.response.status}`);
    }
    throw error;
  }
};

/**
 * Downloads a Boleta PDF from the API and triggers a browser download.
 */
export const downloadBoletaPdfToBrowser = async (boletaId: number, serieCorrelativo: string, format: 'A4' | 'TICKET' = 'A4'): Promise<void> => {
  try {
    // 1. Obtener el PDF como blob
    const response = await invoicingApi.get(`/boletas/${boletaId}/download-pdf`, {
      params: { format },
      responseType: 'blob',
    });

    const pdfBlob = response.data;
    const fileName = `${serieCorrelativo}.pdf`;

    // 2. Disparar la descarga en el navegador
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error al descargar PDF de boleta:", error.response.data);
      throw new Error(`Error de la API al descargar PDF. Código: ${error.response.status}`);
    }
    throw error;
  }
};


/**
 * Busca datos de un cliente por su DNI en la tabla `socio_titulares`.
 * @param docNumber Número de documento del cliente (DNI).
 * @returns Datos del cliente (incluyendo id) o null si no se encuentra.
 */
export const fetchClientByDocument = async (docNumber: string): Promise<Client | null> => {
  if (!docNumber || docNumber.length < 8) {
    return null;
  }
  
  try {
    const { data: socioData, error } = await supabase
      .from('socio_titulares')
      .select('id, dni, nombres, apellidoPaterno, apellidoMaterno, direccionDNI, direccionVivienda, distritoDNI, distritoVivienda, provinciaDNI, provinciaVivienda, regionDNI, regionVivienda, celular')
      .eq('dni', docNumber)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
      console.error("Error al buscar socio en Supabase:", error);
      throw new Error(`Error de base de datos: ${error.message}`);
    }

    if (!socioData) {
      return null;
    }

    const clientData: Client = {
      id: socioData.id, // <-- ID del socio añadido
      tipo_documento: '1',
      numero_documento: socioData.dni,
      razon_social: `${socioData.nombres} ${socioData.apellidoPaterno} ${socioData.apellidoMaterno}`.trim(),
      nombre_comercial: `${socioData.nombres} ${socioData.apellidoPaterno}`.trim(),
      direccion: socioData.direccionDNI || socioData.direccionVivienda || '',
      ubigeo: '', // Se establece en blanco porque no existe en la BD
      distrito: socioData.distritoDNI || socioData.distritoVivienda || '',
      provincia: socioData.provinciaDNI || socioData.provinciaVivienda || '',
      departamento: socioData.regionDNI || socioData.regionVivienda || '',
      telefono: socioData.celular || '',
      email: '',
    };

    return clientData;

  } catch (error) {
    console.error("Error general al buscar cliente en Supabase:", error);
    if (error instanceof Error) {
        throw new Error(`Error de base de datos: ${error.message}`);
    }
    throw new Error('Error al buscar cliente en la base de datos interna.');
  }
};

/**
 * Crea un registro de ingreso en Supabase a partir de una boleta emitida.
 */
export const createIncomeFromBoleta = async (incomeData: Omit<TablesInsert<'ingresos'>, 'id' | 'created_at'>): Promise<void> => {
  try {
    const { error } = await supabase.from('ingresos').insert([incomeData]);

    if (error) {
      console.error("Error al crear el ingreso en Supabase:", error);
      throw new Error(`Error de base de datos al crear ingreso: ${error.message}`);
    }
  } catch (error) {
    console.error("Error general al crear el ingreso:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error desconocido al registrar el ingreso.');
  }
};


/**
 * Simula la obtención de las últimas facturas/boletas para el calendario.
 */
export const fetchRecentInvoices = async (): Promise<InvoicingCalendarItem[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    { id: 101, type: 'Boleta', serie: 'B001-1234', clientName: 'Juan Pérez', amount: 150.00, date: '2025-07-28', status: 'Aceptado' },
    { id: 102, type: 'Factura', serie: 'F001-5678', clientName: 'Tech Solutions SAC', amount: 4500.50, date: '2025-07-27', status: 'Aceptado' },
    { id: 103, type: 'Nota Crédito', serie: 'NC01-0012', clientName: 'María Sánchez', amount: -50.00, date: '2025-07-27', status: 'Aceptado' },
    { id: 104, type: 'Boleta', serie: 'B001-1235', clientName: 'Cliente Anónimo', amount: 85.90, date: '2025-07-26', status: 'Pendiente' },
    { id: 105, type: 'Factura', serie: 'F001-5679', clientName: 'Global Corp S.A.', amount: 12000.00, date: '2025-07-25', status: 'Rechazado' },
    { id: 106, type: 'Boleta', serie: 'B001-1236', clientName: 'Pedro Gómez', amount: 25.00, date: '2025-07-25', status: 'Aceptado' },
  ];
};

/**
 * Crea un resumen diario de boletas para una fecha específica.
 */
export const createDailySummary = async (fecha_resumen: string): Promise<CreateSummaryResponse> => {
  try {
    const payload = {
      company_id: COMPANY_ID,
      branch_id: BRANCH_ID,
      fecha_resumen,
    };
    const response = await invoicingApi.post('/boletas/create-daily-summary', payload);
    const validatedResponse = CreateSummaryResponseSchema.parse(response.data);
    return validatedResponse;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error al crear resumen diario:", error.response.data);
      const apiMessage = error.response.data.message || JSON.stringify(error.response.data);
      throw new Error(`Error de la API: ${apiMessage}`);
    }
    if (error instanceof Error) {
        throw new Error(`Error de red o de procesamiento: ${error.message}`);
    }
    throw new Error('Error desconocido al crear el resumen diario.');
  }
};

/**
 * Envía un resumen diario previamente creado a la SUNAT.
 */
export const sendSummaryToSunat = async (summaryId: number): Promise<SendSummaryResponse> => {
  try {
    const response = await invoicingApi.post(`/daily-summaries/${summaryId}/send-sunat`);
    const validatedResponse = SendSummaryResponseSchema.parse(response.data);
    return validatedResponse;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error al enviar resumen a SUNAT:", error.response.data);
      const apiMessage = error.response.data.message || JSON.stringify(error.response.data);
      throw new Error(`Error de la API: ${apiMessage}`);
    }
    if (error instanceof Error) {
        throw new Error(`Error de red o de procesamiento: ${error.message}`);
    }
    throw new Error('Error desconocido al enviar el resumen a SUNAT.');
  }
};

/**
 * Guarda el resultado del envío del resumen diario en Supabase.
 */
export const saveDailySummaryResult = async (summaryData: SendSummaryData): Promise<void> => {
  try {
    // 1. Insertar la cabecera del resumen
    const resumenToInsert: TablesInsert<'resumenes_diarios'> = {
      fecha_resumen: summaryData.fecha_resumen.split('T')[0], // Asegurar formato YYYY-MM-DD
      numero_completo: summaryData.numero_completo,
      correlativo: summaryData.correlativo,
      ticket: summaryData.ticket,
      estado_sunat: summaryData.estado_sunat,
      summary_api_id: summaryData.id,
    };

    const { data: newSummary, error: summaryError } = await supabase
      .from('resumenes_diarios')
      .insert(resumenToInsert)
      .select('id')
      .single();

    if (summaryError) {
      console.error("Error al guardar cabecera del resumen:", summaryError);
      throw new Error(`Error en Supabase (cabecera): ${summaryError.message}`);
    }

    if (!newSummary) {
      throw new Error("No se pudo obtener el ID del nuevo resumen guardado.");
    }

    // 2. Preparar y guardar el detalle de boletas
    const boletasToInsert: TablesInsert<'resumen_diario_boletas'>[] = summaryData.detalles.map(detalle => ({
      resumen_id: newSummary.id,
      serie_numero: detalle.serie_numero,
    }));

    const { error: boletasError } = await supabase
      .from('resumen_diario_boletas')
      .insert(boletasToInsert);

    if (boletasError) {
      console.error("Error al guardar detalle de boletas:", boletasError);
      // Opcional: Intentar borrar la cabecera si el detalle falla para mantener consistencia
      await supabase.from('resumenes_diarios').delete().eq('id', newSummary.id);
      throw new Error(`Error en Supabase (detalle): ${boletasError.message}`);
    }

  } catch (error) {
    console.error("Error general al guardar resultado del resumen diario:", error);
    // Re-lanzar el error para que el componente UI pueda manejarlo
    throw error;
  }
};

/**
 * Obtiene todos los resúmenes diarios desde Supabase.
 */
export const fetchDailySummaries = async (): Promise<DailySummary[]> => {
  try {
    const { data, error } = await supabase
      .from('resumenes_diarios')
      .select('*')
      .order('fecha_resumen', { ascending: false });

    if (error) {
      console.error("Error al obtener resúmenes diarios:", error);
      throw new Error(`Error de base de datos: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Error general al obtener resúmenes:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error desconocido al obtener los resúmenes diarios.');
  }
};

/**
 * Consulta el estado de un resumen diario en la API externa (n8n/SUNAT).
 */
export const checkSummaryStatus = async (summaryApiId: number): Promise<string | null> => {
  try {
    const response = await invoicingApi.post(`/daily-summaries/${summaryApiId}/check-status`, {});
    const validatedResponse = CheckSummaryStatusResponseSchema.parse(response.data);
    
    if (!validatedResponse.success) {
      throw new Error(validatedResponse.message || "La API indicó un fallo al consultar el estado.");
    }

    return validatedResponse.data.estado_sunat;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error al consultar estado del resumen:", error.response.data);
      const apiMessage = error.response.data.message || JSON.stringify(error.response.data);
      throw new Error(`Error de la API: ${apiMessage}`);
    }
    if (error instanceof z.ZodError) {
        console.error("Error de validación de respuesta:", error.errors);
        throw new Error("La respuesta de la API de consulta de estado tiene un formato inesperado.");
    }
    if (error instanceof Error) {
        throw new Error(`Error de red o de procesamiento: ${error.message}`);
    }
    throw new Error('Error desconocido al consultar el estado del resumen.');
  }
};

/**
 * Actualiza el estado de un resumen diario en la base de datos de Supabase.
 */
export const updateSummaryStatusInDb = async (summaryId: number, newStatus: string | null): Promise<void> => {
    if (newStatus === null) return;
    try {
        const { error } = await supabase
            .from('resumenes_diarios')
            .update({ estado_sunat: newStatus })
            .eq('id', summaryId);

        if (error) {
            console.error("Error al actualizar estado en Supabase:", error);
            throw new Error(`Error de base de datos: ${error.message}`);
        }
    } catch (error) {
        console.error("Error general al actualizar estado:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Error desconocido al actualizar el estado del resumen.');
    }
};


/**
 * Busca un documento (Boleta o Factura) en la base de datos para asociarlo a una Nota de Crédito.
 */
export const fetchDocumentoAfectado = async (
  tipo: 'boleta' | 'factura',
  serie: string,
  numero: string
): Promise<DocumentoAfectado | null> => {
  const serieNumero = `${serie}-${numero}`;
  console.log(`Buscando ingreso con receipt_number: ${serieNumero}`);

  if (tipo !== 'boleta') {
    console.warn("La búsqueda de facturas aún no está implementada.");
    return null;
  }

  try {
    // 1. Buscar el ingreso en la tabla `ingresos`
    const { data: ingresoData, error: ingresoError } = await supabase
      .from('ingresos')
      .select('id, date, amount, dni')
      .eq('receipt_number', serieNumero)
      .single();

    if (ingresoError || !ingresoData) {
      if (ingresoError && ingresoError.code !== 'PGRST116') {
        console.error("Error al buscar el ingreso en Supabase:", ingresoError);
      } else {
        console.log(`No se encontró ingreso para ${serieNumero}.`);
      }
      return null;
    }

    if (!ingresoData.dni) {
        console.error(`El ingreso con ID ${ingresoData.id} no tiene un DNI asociado.`);
        throw new Error("El comprobante original no está asociado a un cliente y no se puede anular.");
    }

    // 2. Buscar los datos del socio en `socio_titulares` usando el DNI del ingreso
    const { data: socioData, error: socioError } = await supabase
      .from('socio_titulares')
      .select('id, dni, nombres, apellidoPaterno, apellidoMaterno, direccionDNI, distritoDNI, provinciaDNI, regionDNI')
      .eq('dni', ingresoData.dni)
      .single();

    if (socioError || !socioData) {
        console.error(`Error al buscar el socio con DNI ${ingresoData.dni}:`, socioError);
        throw new Error("No se pudieron encontrar los datos del cliente asociado al comprobante.");
    }

    // 3. Construir el objeto Cliente
    const client: Client = {
      id: Number(socioData.id),
      tipo_documento: '1',
      numero_documento: socioData.dni,
      razon_social: `${socioData.nombres} ${socioData.apellidoPaterno} ${socioData.apellidoMaterno}`.trim(),
      direccion: socioData.direccionDNI || '',
      distrito: socioData.distritoDNI || '',
      provincia: socioData.provinciaDNI || '',
      departamento: socioData.regionDNI || '',
    };

    // 4. Construir un detalle genérico a partir del monto total del ingreso.
    const detalles: z.infer<typeof DetalleBoletaSchema>[] = [
        {
            descripcion: `Servicio según comprobante ${serieNumero}`,
            unidad: 'NIU',
            cantidad: 1,
            mto_valor_unitario: ingresoData.amount, // Usamos 'amount'. Este es el precio CON IGV
            porcentaje_igv: 18.00, // Asumimos 18%
            tip_afe_igv: '10', // Gravado - Operación Onerosa
        }
    ];

    // 5. Construir y devolver el objeto DocumentoAfectado
    const documento: DocumentoAfectado = {
      id: ingresoData.id,
      fecha_emision: ingresoData.date,
      moneda: 'PEN',
      client: client,
      detalles: detalles,
      mto_imp_venta: ingresoData.amount,
    };

    return documento;

  } catch (error) {
    console.error("Error general en fetchDocumentoAfectado:", error);
    if (error instanceof Error) throw error;
    throw new Error("Error desconocido al buscar el documento afectado.");
  }
};

/**
 * Emite una Nota de Crédito Electrónica.
 */
export const issueNotaCredito = async (payload: NotaCreditoPayload): Promise<IssueResponse> => {
  try {
    const response = await invoicingApi.post('/credit-notes', payload);
    const validatedResponse = IssueResponseSchema.parse(response.data);
    return validatedResponse;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error al emitir nota de crédito:", error.response.data);
      const apiMessage = error.response.data.message || JSON.stringify(error.response.data);
      throw new Error(`Error de la API de facturación: ${apiMessage}`);
    }
    if (error instanceof Error) {
        throw new Error(`Error al procesar la respuesta o de red: ${error.message}`);
    }
    throw new Error('Error desconocido al emitir la nota de crédito.');
  }
};

/**
 * Envía una Nota de Crédito a la SUNAT.
 */
export const sendNotaCreditoToSunat = async (creditNoteId: number): Promise<void> => {
  try {
    await invoicingApi.post(`/credit-notes/${creditNoteId}/send-sunat`);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error al enviar NC a SUNAT:", error.response.data);
      throw new Error(`Error de la API al enviar a SUNAT: ${error.response.data.message || 'Error desconocido'}`);
    }
    throw new Error('Error de red al enviar la Nota de Crédito a SUNAT.');
  }
};

/**
 * Actualiza un registro de ingreso existente para reflejar una devolución por Nota de Crédito.
 */
export const updateIncomeOnCreditNote = async (originalSerieNumero: string, creditNoteAmount: number, creditNoteSerieNumero: string): Promise<void> => {
  try {
    // 1. Encontrar el ingreso original
    const { data: originalIncome, error: findError } = await supabase
      .from('ingresos')
      .select('id, amount')
      .eq('receipt_number', originalSerieNumero)
      .single();

    if (findError || !originalIncome) {
      console.warn(`No se encontró un registro de ingreso para el comprobante ${originalSerieNumero}. No se actualizará.`);
      return;
    }

    // 2. Actualizar el registro para reflejar la anulación
    const { error: updateError } = await supabase
      .from('ingresos')
      .update({
        transaction_type: 'Nota de Crédito',
        receipt_number: creditNoteSerieNumero,
        amount: -Math.abs(creditNoteAmount),
      })
      .eq('id', originalIncome.id);

    if (updateError) {
      throw new Error(`Error al actualizar el ingreso en Supabase: ${updateError.message}`);
    }
  } catch (error) {
    console.error("Error en updateIncomeOnCreditNote:", error);
    throw error;
  }
};
