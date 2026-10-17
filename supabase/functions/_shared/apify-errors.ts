import { AIError } from './ai-contracts.ts';

// Only known public error codes may enter logs. Provider messages can contain
// URLs, inputs or credentials and must never be returned or logged.
const safeTypes = new Set([
  'usage-limit-exceeded', 'insufficient-funds', 'payment-required',
  'monthly-usage-hard-limit-exceeded', 'platform-feature-disabled',
  'invalid-token', 'unauthorized', 'forbidden', 'not-found',
  'actor-not-found', 'invalid-input', 'rate-limit-exceeded',
]);
const billingTypes = new Set(['usage-limit-exceeded', 'insufficient-funds', 'payment-required', 'monthly-usage-hard-limit-exceeded']);
export class ApifyProviderError extends AIError {
  readonly definitive: boolean;
  readonly providerType: string;
  constructor(public readonly providerStatus: number, providerType: string) {
    super(providerStatus === 402 || billingTypes.has(providerType)
      ? 'Descargas pausadas: se agotó la cuota mensual del servicio de descarga.'
      : providerType === 'platform-feature-disabled'
        ? 'Descargas pausadas. El equipo debe revisar el plan, saldo o permisos del servicio de descarga.'
        : 'El servicio de descarga no pudo aceptar la solicitud. Inténtalo más tarde.', 503);
    this.providerType = safeTypes.has(providerType) ? providerType : 'unknown';
    this.definitive = providerStatus >= 400 && providerStatus < 500 && providerStatus !== 408;
  }
}
export async function apifyResponseError(response: Response): Promise<ApifyProviderError> {
  let type = 'unknown';
  try {
    const body = await response.json();
    if (typeof body?.error?.type === 'string' && safeTypes.has(body.error.type)) type = body.error.type;
  } catch { /* A non-JSON rejection is still definitive when its HTTP status is. */ }
  return new ApifyProviderError(response.status, type);
}
export function apifyErrorLog(error: unknown) {
  return error instanceof ApifyProviderError
    ? { status: error.providerStatus, type: error.providerType }
    : { status: null, type: 'network-error' };
}
export function downloadStartFailure(error: unknown) {
  return error instanceof ApifyProviderError && error.definitive
    ? { status: 'rejected' as const, failure_message: error.message }
    : { status: 'unknown' as const, failure_message: 'No se pudo confirmar el inicio de la descarga. Contacta a soporte para revisarla.' };
}
