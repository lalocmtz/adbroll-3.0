# Lanzamiento US$15 · 14 octubre 2026

Oferta aprobada: US$15 mensuales desde el primer pago; sin prueba o descuento por referido. Comisión directa US$5 por primer pago elegible, 15% de renovaciones; líder 5% de renovaciones indirectas, una generación. Pagos manuales semanales desde US$50. El precio MXN mostrado es ilustrativo; Stripe cobra USD.

## Configuración aplicada
- Stripe cuenta acct_1SbcpyL7UvJMc43Y, producto TokXray Pro prod_VIBznzFL4oQUmI.
- Nuevo precio activo y predeterminado: price_1UQVBeL7UvJMc43YMClti8g1 · USD1500 · mensual. Precios anteriores conservados; no se modificaron contratos existentes.
- Supabase tnqvvfpzkjwgllwdwvte: STRIPE_PRICE_ID_PRO actualizado al nuevo identificador.
- Migración affiliate_price15_policy_v4 aplicada. RPC solo service_role.
- Política 2026-10-14; RPC record_affiliate_commission_v4. Políticas previas v1/v2/v3 conservadas.
- stripe-webhook versión10 y create-checkout versión12 publicados con billing compartido. JWT conservado: webhook con firma Stripe; checkout JWT obligatorio.
- Elegibilidad inicial basada en facturas realmente pagadas del producto; intentos expirados sin pago no consumen bono. Reactivaciones pagadas no generan otro bono inicial.

## Validación
149 pruebas automatizadas, TypeScript y compilación aprobados. SQL local cubre duplicados, atribución, reactivación, reembolsos y conservación histórica. Permisos RPC comprobados en producción. Documentos renderizados y revisados en seis páginas.

La compra real con tarjeta y la recepción de su webhook deben comprobarse con la prueba del propietario. No se realizó un cargo en este lanzamiento.
