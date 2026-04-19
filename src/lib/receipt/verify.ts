/**
 * Receipt System – Self-contained verification script
 * Run with: npx tsx src/lib/receipt/verify.ts
 * (No bundler required — pure Node + tsx)
 *
 * Outputs rendered receipts for 32-char and 48-char widths to stdout.
 * Output is deterministic: same config always produces identical text.
 */

// ---- Inline renderer (same logic as receiptRenderer.ts) -------------------
// We duplicate here so this file can run as a standalone script without
// bundler path resolution.

interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
}

interface ReceiptConfig {
  layout: {
    maxCharsPerLine: number;
    priceColWidth?:  number;
    qtyColWidth?:    number;
    compactMode?:    boolean;
    currencySymbol?: string;
    locale?:         string;
    dividerChar?:    string;
  };
  toggles?: {
    logo?:         boolean; storeName?:    boolean; address?:      boolean;
    phone?:        boolean; orderId?:      boolean; date?:         boolean;
    cashier?:      boolean; items?:        boolean; subtotal?:     boolean;
    tax?:          boolean; discount?:     boolean; total?:        boolean;
    paymentMethod?:boolean; qrCode?:       boolean; footerText?:   boolean;
  };
  store?:       { name?: string; address?: string; phone?: string };
  transaction?: { orderId?: string; date?: string; cashier?: string };
  items?:       ReceiptItem[];
  totals?:      { subtotal: number; tax?: number; discount?: number; total: number };
  payment?:     { method?: string; amountPaid?: number; change?: number };
  footerText?:  string;
}

const DEFAULTS = {
  priceColWidth: 10, qtyColWidth: 4, compactMode: false,
  currencySymbol: "Rp", locale: "id-ID", dividerChar: "-",
};

const DEFAULT_TOGGLES = {
  logo:true,storeName:true,address:true,phone:true,orderId:true,date:true,
  cashier:true,items:true,subtotal:true,tax:true,discount:true,total:true,
  paymentMethod:true,qrCode:false,footerText:true,
};

function exact(s:string,w:number,a:"left"|"right"="left"):string {
  if(s.length>w)return s.slice(0,w);
  const p=" ".repeat(w-s.length);return a==="right"?p+s:s+p;
}
function center(s:string,w:number):string {
  if(s.length>=w)return s.slice(0,w);
  const t=w-s.length,l=Math.floor(t/2),r=t-l;
  return " ".repeat(l)+s+" ".repeat(r);
}
function divider(c:string,w:number):string{return c.repeat(w);}
function wordWrap(text:string,max:number):string[]{
  if(max<=0)return[];
  const words=text.split(" "),lines:string[]=[];let cur="";
  for(const w of words){
    if(w.length>max){
      if(cur)lines.push(cur),cur="";
      for(let i=0;i<w.length;i+=max){
        const chunk=w.slice(i,i+max);
        i+max<w.length?lines.push(chunk):cur=chunk;
      }continue;
    }
    const c=cur?cur+" "+w:w;
    c.length<=max?cur=c:(cur&&lines.push(cur),cur=w);
  }
  if(cur)lines.push(cur);return lines;
}
function fmtCur(n:number,sym:string,loc:string):string{
  return sym+n.toLocaleString(loc,{minimumFractionDigits:0,maximumFractionDigits:0});
}
function labelVal(label:string,val:string,w:number):string{
  const ml=w-val.length-1;
  if(ml<=0)return exact(val,w,"right");
  return exact(label,ml,"left")+exact(val,w-ml,"right");
}

function renderReceipt(cfg: ReceiptConfig): string {
  const L = { ...DEFAULTS, ...cfg.layout };
  const T = { ...DEFAULT_TOGGLES, ...(cfg.toggles??{}) };
  const W = L.maxCharsPerLine;
  const lines: string[] = [];
  const fmt = (n:number)=>fmtCur(n,L.currencySymbol,L.locale);

  // Header
  if(T.logo) lines.push(center("[LOGO]",W));
  if(T.storeName&&cfg.store?.name)
    wordWrap(cfg.store.name,W).forEach(l=>lines.push(center(l,W)));
  if(T.address&&cfg.store?.address)
    wordWrap(cfg.store.address,W).forEach(l=>lines.push(center(l,W)));
  if(T.phone&&cfg.store?.phone)
    lines.push(center(cfg.store.phone,W));
  if(!L.compactMode)lines.push("");

  // Meta
  let hasMeta=false;
  if(T.orderId&&cfg.transaction?.orderId){lines.push(labelVal("Order #",cfg.transaction.orderId,W));hasMeta=true;}
  if(T.date&&cfg.transaction?.date){lines.push(labelVal("Date",cfg.transaction.date,W));hasMeta=true;}
  if(T.cashier&&cfg.transaction?.cashier){lines.push(labelVal("Cashier",cfg.transaction.cashier,W));hasMeta=true;}
  if(hasMeta)lines.push(divider(L.dividerChar,W));

  // Items
  if(T.items&&cfg.items?.length){
    const nw=W-L.qtyColWidth-L.priceColWidth;
    for(const item of cfg.items){
      const qs=`x${item.qty}`.slice(0,L.qtyColWidth);
      const ps=fmt(item.totalPrice).slice(0,L.priceColWidth);
      const nl=wordWrap(item.name,nw);
      nl.forEach((n,i)=>{
        if(i===0) lines.push(exact(n,nw)+exact(qs,L.qtyColWidth)+exact(ps,L.priceColWidth,"right"));
        else      lines.push(exact(n,nw)+" ".repeat(L.qtyColWidth)+" ".repeat(L.priceColWidth));
      });
    }
    lines.push(divider(L.dividerChar,W));
  }

  // Totals
  if(cfg.totals){
    if(T.subtotal) lines.push(labelVal("Subtotal",fmt(cfg.totals.subtotal),W));
    if(T.tax&&cfg.totals.tax&&cfg.totals.tax>0)     lines.push(labelVal("Tax",fmt(cfg.totals.tax),W));
    if(T.discount&&cfg.totals.discount&&cfg.totals.discount>0)
      lines.push(labelVal("Discount",`-${fmt(cfg.totals.discount)}`,W));
    if(T.total){
      lines.push(divider(L.dividerChar,W));
      lines.push(labelVal("TOTAL",fmt(cfg.totals.total),W));
      lines.push(divider(L.dividerChar,W));
    }
    if(!L.compactMode)lines.push("");
  }

  // Payment
  if(T.paymentMethod&&cfg.payment){
    const p=cfg.payment;
    if(p.method)       lines.push(labelVal("Payment",p.method,W));
    if(p.amountPaid!==undefined) lines.push(labelVal("Paid",fmt(p.amountPaid),W));
    if(p.change!==undefined)     lines.push(labelVal("Change",fmt(p.change),W));
    if(!L.compactMode) lines.push("");
  }

  // QR
  if(T.qrCode){lines.push(center("[QR]",W));if(!L.compactMode)lines.push("");}

  // Footer
  if(T.footerText&&cfg.footerText)
    wordWrap(cfg.footerText,W).forEach(l=>lines.push(center(l,W)));

  return lines.map(l=>exact(l,W)).join("\n");
}

// ---------------------------------------------------------------------------
// Example configs
// ---------------------------------------------------------------------------

const STORE = {
  name:    "Warung Nasi Padang Bu Siti & Keluarga Besar",
  address: "Jl. Kebon Sirih No. 45, Jakarta Pusat",
  phone:   "(021) 3100-9988",
};
const ITEMS = [
  { name:"Nasi Putih",                   qty:3, unitPrice:5000,  totalPrice:15000  },
  { name:"Rendang Sapi Premium Spesial",  qty:2, unitPrice:35000, totalPrice:70000  },
  { name:"Sayur Nangka",                 qty:1, unitPrice:8000,  totalPrice:8000   },
  { name:"Es Teh Manis",                 qty:3, unitPrice:5000,  totalPrice:15000  },
  { name:"Kerupuk Merah",               qty:1, unitPrice:2000,  totalPrice:2000   },
];
const TOTALS = { subtotal:110000, tax:11000, discount:5000, total:116000 };
const TXN    = { orderId:"ORD-20260419-0042", date:"19 Apr 2026 09:17", cashier:"Dewi Rahayu" };
const PAMENT = { method:"Cash", amountPaid:150000, change:34000 };

const cfg32: ReceiptConfig = {
  layout:{ maxCharsPerLine:32, priceColWidth:9, qtyColWidth:3, compactMode:true,
           currencySymbol:"Rp", locale:"id-ID", dividerChar:"-" },
  toggles:{ logo:true,storeName:true,address:true,phone:true,orderId:true,date:true,
            cashier:true,items:true,subtotal:true,tax:true,discount:true,total:true,
            paymentMethod:true,qrCode:false,footerText:true },
  store:STORE, transaction:TXN, items:ITEMS, totals:TOTALS, payment:PAMENT,
  footerText:"Terima kasih! Selamat makan.",
};

const cfg48: ReceiptConfig = {
  layout:{ maxCharsPerLine:48, priceColWidth:12, qtyColWidth:5, compactMode:false,
           currencySymbol:"Rp", locale:"id-ID", dividerChar:"=" },
  toggles:{ logo:true,storeName:true,address:true,phone:true,orderId:true,date:true,
            cashier:true,items:true,subtotal:true,tax:true,discount:true,total:true,
            paymentMethod:true,qrCode:true,footerText:true },
  store:STORE, transaction:TXN, items:ITEMS, totals:TOTALS, payment:PAMENT,
  footerText:"Terima kasih! Kunjungi kami lagi. Selamat makan.",
};

// ---------------------------------------------------------------------------
// Print
// ---------------------------------------------------------------------------

const box = (label:string, width:number, body:string) =>
  `\n${"=".repeat(width+4)}\n| ${label.padEnd(width+2)} |\n${"=".repeat(width+4)}\n` +
  body.split("\n").map(l=>`| ${l} |`).join("\n") +
  `\n${"=".repeat(width+4)}\n`;

console.log(box(`32-char  (58mm printer) — compact`, 32, renderReceipt(cfg32)));
console.log(box(`48-char  (80mm printer) — full`,    48, renderReceipt(cfg48)));
