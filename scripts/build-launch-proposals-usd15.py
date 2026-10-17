"""Editable source. Render with bundled Python (ReportLab); no live data or billing mutations."""
from pathlib import Path
import json, re
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf/lanzamiento-usd15'; OUT.mkdir(parents=True,exist_ok=True)
COPY=ROOT/'docs/marketing/lanzamiento-usd15'; COPY.mkdir(parents=True,exist_ok=True)
for name,file in [('Arial','Arial.ttf'),('ArialB','Arial Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(Path('/System/Library/Fonts/Supplemental')/file)))
pdfmetrics.registerFontFamily('Arial',normal='Arial',bold='ArialB',italic='Arial',boldItalic='ArialB')
W,H=600,800
BG='#09090F'; PANEL='#171720'; WHITE='#F7F7FA'; MUTED='#BABDCC'; PINK='#FE2C55'; CYAN='#25F4EE'
REGISTER='https://tokxray.com/register?redirect=%2Faffiliates'
PROGRAM='https://tokxray.com/programa-creadores'
WHATSAPP='https://wa.me/522213267653'
checks=[]
class Deck:
    def __init__(self,name,title):
        self.name=name;self.path=OUT/(name+'.pdf');self.n=0;self.copy=[]
        self.c=canvas.Canvas(str(self.path),pagesize=(W,H));self.c.setTitle(title);self.c.setAuthor('TokXray');self.c.setSubject('Invitación y condiciones de colaboración · Plan US$15 al mes')
    def box(self,x,y,w,h,fill=PANEL):
        self.c.setFillColor(HexColor(fill));self.c.roundRect(x,H-y-h,w,h,13,stroke=0,fill=1)
    def p(self,text,x,y,w,size=14,color=WHITE,bold=False,leading=None):
        style=ParagraphStyle('p',fontName='ArialB' if bold else 'Arial',fontSize=size,leading=leading or size*1.35,textColor=HexColor(color))
        p=Paragraph(text,style);_,height=p.wrap(w,1000)
        assert y+height<=724,(self.name,self.n,text,y+height)
        p.drawOn(self.c,x,H-y-height)
        checks.append({'file':self.name,'page':self.n,'top':y,'bottom':y+height,'text':text})
        self.copy.append(re.sub('<[^>]+>','',text.replace('<br/>','\n')))
        return y+height
    def start(self,kicker,title):
        if self.n:self.c.showPage()
        self.n+=1;self.copy.append('\n## Página '+str(self.n)+' · '+kicker+'\n')
        c=self.c;c.setFillColor(HexColor(BG));c.rect(0,0,W,H,stroke=0,fill=1)
        c.drawImage(str(ROOT/'public/brand/tokxray-social-1024.png'),36,H-69,38,38,mask='auto')
        self.p('Tok<font color="'+PINK+'">Xray</font>',83,40,175,21,bold=True)
        self.p(kicker.upper(),310,44,254,9,MUTED)
        self.p(title,36,102,528,37,bold=True,leading=42)
        c.setStrokeColor(HexColor('#30303C'));c.line(36,58,564,58)
        c.setFillColor(HexColor(MUTED));c.setFont('Arial',8)
        c.drawString(36,39,'TOKXRAY · PLAN US$15/MES · OCTUBRE 2026')
        c.drawRightString(564,39,f'{self.n:02d} / 03')
    def link(self,label,url,y=665):
        self.box(36,y,528,46,PINK);self.p(label,53,y+12,494,15,bold=True)
        self.c.linkURL(url,(36,H-y-46,564,H-y),relative=0,thickness=0)
        self.copy.append(url)
    def card(self,num,title,body,y,h=100):
        self.box(36,y,528,h);self.p(num,53,y+16,40,24,CYAN,True)
        self.p(title,105,y+17,439,16,bold=True);self.p(body,105,y+43,436,12.5,MUTED)
    def table(self,headers,rows,y,widths):
        for rownum,row in enumerate([headers]+rows):
            self.box(36,y+rownum*48,528,48,PANEL if rownum%2==0 else '#111119');x=36
            for text,width in zip(row,widths):
                self.p(text,x+12,y+rownum*48+13,width-24,11.5 if rownum==0 else 14,CYAN if rownum==0 else WHITE,rownum==0)
                x+=width
    def contacts(self,y=684):
        self.p('<link href="'+WHATSAPP+'" color="'+CYAN+'">WhatsApp +52 221 326 7653</link> · <link href="mailto:contacto@tokxray.com" color="'+CYAN+'">contacto@tokxray.com</link>',36,y,528,10.5,MUTED)
    def save(self):
        assert self.n==3
        self.c.save();(COPY/(self.name+'.md')).write_text('# '+self.name.replace('_',' ')+'\n\n'+'\n\n'.join(self.copy)+'\n',encoding='utf8')

D=Deck('TokXray_Invitacion_Creadores_USD15','TokXray · Invitación a creadores y afiliados')
D.start('Creadores y afiliados','Deja de grabar a ciegas.<br/>Después, compártelo.')
D.p('Si creas para TikTok Shop, sabes cuánto tiempo cuesta decidir qué producto mostrar y qué decir. TokXray te ayuda a preparar el siguiente video con una referencia, no solo con intuición.',36,208,528,16,MUTED)
D.card('01','Elige una referencia con ventas','Explora videos y productos de TikTok Shop México. Revisa cuánto vendieron y a qué periodo corresponde el reporte.',307,101)
D.card('02','Entiende y adapta su guion','Revisa cómo empieza, presenta el producto y cierra. Prepara una versión con tu voz y tu experiencia.',421,101)
D.card('03','Graba, prueba y recomienda','Lleva tu idea a cámara. Si TokXray te resulta útil, comparte cómo lo usas con tu enlace o código.',535,101)
D.p('Reportes semanales, no datos en tiempo real. Una referencia no garantiza ventas ni viralidad. TokXray es una herramienta independiente de TikTok.',36,660,528,11,MUTED)

D.start('Tu recomendación','Tu código. Tus clientes.<br/>Una comisión clara.')
D.box(36,208,528,78,'#102225');D.p('Tu cliente paga US$15 al mes',54,222,492,23,CYAN,True)
D.p('Desde el primer mes. Tu código atribuye la recomendación; no da descuento.',54,258,490,11.5,MUTED)
D.box(36,305,254,133);D.box(306,305,258,133)
D.p('US$5',54,323,216,36,PINK,True);D.p('por el primer pago elegible directo,<br/>una sola vez por cliente',54,380,217,12.5)
D.p('15%',324,323,216,36,CYAN,True);D.p('de sus renovaciones elegibles:<br/>US$2.25 por cada pago de US$15',324,380,216,12.5)
D.table(['Clientes directos','Primer pago · una vez','Si todos renuevan ese mes'],[['10','US$50','US$22.50'],['100','US$500','US$225']],460,[136,175,217])
D.p('Ejemplos aritméticos sobre pagos de US$15 sin impuestos; no son ingresos garantizados. No hay comisión por registros gratuitos ni por meses sin pago. Reembolsos y disputas pueden ajustar el saldo.',36,622,528,11.5,MUTED)
D.p('Revisión semanal y transferencia manual al reunir al menos US$50 disponibles. Las comisiones se contabilizan en USD.',36,685,528,11.5,MUTED)

D.start('La invitación','3 videos originales.<br/>Acceso sin mensualidad.')
D.p('Para los primeros 100 creadores aprobados: publica tres videos originales sobre tu experiencia con TokXray y autoriza su uso en anuncios durante 12 meses.',36,207,528,15.5)
D.box(36,291,528,82,'#102225')
D.p('El lugar se confirma al aprobar tu entrega',54,307,490,16,CYAN,True)
D.p('Crear la cuenta, enviar la solicitud o probar la herramienta no reserva cupo. Consulta la disponibilidad actual en la página del programa.',54,336,490,11.5,MUTED)
D.p('<b>1.</b> Crea tu cuenta gratis y abre el programa de creadores.<br/><b>2.</b> Coordina tu acceso inicial para conocer la herramienta y grabar.<br/><b>3.</b> Envía las tres publicaciones, los archivos originales y el permiso de anuncios.<br/><b>4.</b> Tras la revisión y aprobación, se confirma tu acceso y el cupo.',36,397,528,13,leading=20)
D.p('El acceso es personal y dura mientras opere TokXray. La licencia publicitaria dura 12 meses; extenderla requiere otro acuerdo. Identifica la colaboración y cuenta tu experiencia real: no se exige una opinión positiva ni resultados de ventas.',36,505,528,11.5,MUTED)
D.p('La cuenta y vista previa son gratuitas; Pro cuesta US$15 y se renueva automáticamente cada mes. Puedes cancelar antes del siguiente cobro. El acceso del programa requiere aprobación.',36,588,528,11.5,MUTED)
D.link('Ver el programa y la disponibilidad',PROGRAM,654)
D.p('<link href="'+REGISTER+'" color="'+CYAN+'">Crear mi cuenta</link> · <link href="'+WHATSAPP+'" color="'+CYAN+'">WhatsApp +52 221 326 7653</link> · <link href="mailto:contacto@tokxray.com" color="'+CYAN+'">contacto@tokxray.com</link>',36,709,528,9.8,MUTED)
D.save()

D=Deck('TokXray_Propuesta_Lideres_USD15','TokXray · Propuesta para líderes de comunidad')
D.start('Líderes de comunidad','Ayuda a tu comunidad<br/>a decidir qué grabar.')
D.p('Tu comunidad no necesita otra promesa de videos virales. Necesita referencias para elegir un producto, entender qué decir y preparar su propia versión.',36,207,528,16,MUTED)
D.card('01','Presenta una herramienta útil','TokXray reúne videos con ventas reportadas, productos, guiones y análisis para creadores de TikTok Shop México.',300,102)
D.card('02','Invita y acompaña a creadores','Muéstrales cómo elegir una referencia, adaptar el guion a su voz y llevarlo a una grabación.',416,102)
D.card('03','Gana cuando hay pagos elegibles','Tus clientes directos generan tu comisión. Las renovaciones de clientes de tus creadores asociados generan el bono de líder.',532,102)
D.p('Plan para clientes: US$15 al mes desde el inicio, sin descuento por código. Se renueva automáticamente cada mes; pueden cancelar antes del siguiente cobro.',36,660,528,12,MUTED)

D.start('El reparto','Directo o indirecto.<br/>Solo un escalón adicional.')
D.box(36,207,528,103);D.p('Tus clientes directos',54,223,490,18,PINK,True)
D.p('US$5 por el primer pago elegible, una sola vez por cliente.<br/>15% de sus renovaciones: US$2.25 por cada pago de US$15.',54,258,490,13)
D.box(36,329,528,103,'#102225');D.p('Clientes de tus creadores asociados',54,345,490,18,CYAN,True)
D.p('5% de sus renovaciones elegibles: US$0.75 por cada pago de US$15.<br/>El creador conserva su 15%; no se descuenta de su comisión.',54,381,490,12.5)
D.p('<b>Ejemplo:</b> Ana es líder de Beto. Beto refiere 100 clientes que pagan US$15.',36,455,528,13)
D.table(['Por esos 100 clientes','Beto · directo','Ana · líder'],[['Primeros pagos','US$500','US$0'],['100 renovaciones en un mes','US$225','US$75']],492,[270,129,129])
D.p('Ejemplo aritmético, no una previsión. El bono de líder no se paga por la primera compra indirecta ni por abrir cuentas. Si un cliente de Beto invita a otra persona, Ana no recibe comisión por ese nivel.',36,655,528,11.5,MUTED)

D.start('Cómo comenzar','Una relación registrada.<br/>Cuentas claras.')
D.p('<b>1.</b> <link href="'+REGISTER+'" color="'+CYAN+'">Crea tu cuenta</link> y escríbenos para solicitar el alta como líder.<br/><b>2.</b> Registra a los creadores que acepten tu invitación antes de sus ventas.<br/><b>3.</b> Cada creador comparte su enlace o código con sus clientes.<br/><b>4.</b> Revisa las comisiones y coordina tus transferencias con el equipo.',36,207,528,13.5,leading=22)
D.box(36,329,528,106,'#102225');D.p('También puedes solicitar el acceso sin mensualidad',54,345,490,16,CYAN,True)
D.p('<link href="'+PROGRAM+'" color="'+CYAN+'">Consulta la convocatoria</link>: primeros 100 aprobados, tres videos originales publicados y permiso de anuncios por 12 meses. El acceso es personal mientras opere TokXray. La solicitud no reserva lugar.',54,382,490,11.5,MUTED)
D.p('<b>Reglas de comisión.</b> Un líder por creador asociado; solo una generación indirecta. No se suman el 15% directo y el 5% de líder para ti sobre el mismo pago. No se paga por reclutar ni por registros gratuitos.',36,458,528,12)
D.p('<b>Liquidación.</b> Revisión semanal y transferencias manuales desde US$50 disponibles. Comisiones en USD sobre pagos elegibles, sin impuestos; reembolsos y disputas ajustan el saldo. Sin pago, no hay comisión de ese mes.',36,537,528,11.5,MUTED)
D.p('Los datos del catálogo corresponden a reportes semanales, no al tiempo real. No garantizamos ventas, viralidad ni ingresos. TokXray no está afiliado a TikTok.',36,612,528,10.5,MUTED)
D.link('Quiero presentar mi comunidad',WHATSAPP,662)
D.contacts(709)
D.save()
(OUT/'layout-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
print('\n'.join(str(p) for p in OUT.glob('*.pdf')))
