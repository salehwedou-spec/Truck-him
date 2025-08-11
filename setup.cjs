const fs = require('fs');
const path = require('path');

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

const files = {
  'package.json': `{
  "name": "almersal",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.10.2",
    "autoprefixer": "^10.4.14",
    "bcryptjs": "^2.4.3",
    "next": "14.1.0",
    "next-auth": "^4.24.5",
    "next-intl": "^2.13.0",
    "qrcode": "^1.5.3",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "tailwindcss": "^3.3.3",
    "zod": "^3.22.2"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.2",
    "@types/node": "^20.5.6",
    "@types/react": "^18.2.14",
    "@types/react-dom": "^18.2.6",
    "postcss": "^8.4.21",
    "prisma": "^5.10.2",
    "ts-node": "^10.9.1",
    "typescript": "^5.2.2"
  }
}`,
  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {"@/*": ["src/*"]}
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", "prisma/seed.ts"],
  "exclude": ["node_modules"]
}`,
  'next.config.js': `const nextConfig = {
  experimental: { appDir: true },
  i18n: { locales: ['en','ar'], defaultLocale: 'en' }
};
module.exports = nextConfig;`,
  'postcss.config.js': `module.exports = {plugins:{tailwindcss:{},autoprefixer:{}}};`,
  'tailwind.config.js': `module.exports = {content:["./src/**/*.{ts,tsx}"],theme:{extend:{}},plugins:[]};`,
  '.env': `DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="change-me"
NEXTAUTH_URL="http://localhost:3000"`,
  'next-env.d.ts': `/// <reference types="next" />
/// <reference types="next/image-types/global" />
/// <reference types="next/navigation-types/compat/navigation" />
// NOTE: This file should not be edited`,
  'prisma/schema.prisma': `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  name      String?
  password  String
  role      Role    @default(EMPLOYEE)
  remittances Remittance[] @relation("createdBy")
}

model Remittance {
  id          Int      @id @default(autoincrement())
  internalId  Int      @unique
  provider    Provider
  channel     Channel
  amountMRU   Float
  destCountry String
  destCurrency String
  tracking    String
  fee         Float
  providerFee Float
  total       Float
  qr          String
  createdAt   DateTime @default(now())
  createdBy   User     @relation("createdBy", fields:[createdById], references:[id])
  createdById Int
}

model Setting {
  id           Int @id @default(1)
  officeName   String
  address      String
  phone        String
  logoUrl      String?
  policies     String
  monthlyExpense Float @default(0)
}

enum Provider {
  WU
  RIA
  MG
  WAVE
  OM
}

enum Channel {
  CASH
  MOBILE
}

enum Role {
  ADMIN
  EMPLOYEE
}
`,
  'prisma/seed.ts': `import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
  const adminPassword = await bcrypt.hash('Admin@12345',10);
  const emp1Password = await bcrypt.hash('Sawda@12345',10);
  const emp2Password = await bcrypt.hash('Abdellahi@12345',10);
  await prisma.user.createMany({
    data:[
      {email:'wedoucrypto@gmail.com',name:'Admin',password:adminPassword,role:'ADMIN'},
      {email:'sawda@almersal.local',name:'Sawda',password:emp1Password,role:'EMPLOYEE'},
      {email:'abdellahi@almersal.local',name:'Abdellahi',password:emp2Password,role:'EMPLOYEE'}
    ],
    skipDuplicates:true
  });
  await prisma.setting.upsert({
    where:{id:1},
    update:{},
    create:{
      officeName:'Al Mersal',
      address:'',
      phone:'',
      logoUrl:'',
      policies:'1) يعاد أصل المبلغ فقط عند الإلغاء قبل التنفيذ؛ الرسوم غير مستردة.\n2) غير مسؤولين عن تأخير/فقد بسبب بيانات خاطئة أو سياسات المزود.\n3) تعديل اسم المستفيد قد يستلزم رسومًا.\n4) الحوالات الدولية خاضعة لشروط مزود بلد الاستلام.\n5) احتفظ بالوصل ورقم التتبع حتى الاستلام.',
      monthlyExpense:0
    }
  });
}
main().finally(() => prisma.$disconnect());`,
  'src/lib/prisma.ts': `import { PrismaClient } from '@prisma/client';
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient({log:['query']});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;`,
  'src/lib/auth.ts': `import { prisma } from '@/lib/prisma';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { NextAuthOptions } from 'next-auth';
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [CredentialsProvider({
    name: 'Credentials',
    credentials: { email: { label: 'Email', type: 'text' }, password: { label: 'Password', type: 'password' } },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;
      const user = await prisma.user.findUnique({ where: { email: credentials.email } });
      if (!user) return null;
      const valid = await bcrypt.compare(credentials.password, user.password);
      if (!valid) return null;
      return { id: String(user.id), email: user.email, role: user.role, name: user.name };
    }
  })],
  callbacks: {
    async jwt({ token, user }) { if (user) token.role = user.role; return token; },
    async session({ session, token }) { if (session.user) session.user.role = token.role; return session; }
  }
};`,
  'src/app/api/auth/[...nextauth]/route.ts': `import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };`,
  'src/middleware.ts': `import { withLocale } from 'next-intl/middleware';
export default withLocale({locales:['en','ar'],defaultLocale:'en'});
export const config = {matcher:['/((?!api|_next|.*\\..*).*)']};`,
  'src/messages/en.json': `{
  "signIn": "Sign in",
  "email": "Email",
  "password": "Password",
  "providers": {"WU":"Western Union","RIA":"RIA","MG":"MoneyGram","WAVE":"WAVE","OM":"Orange Money"},
  "channel": {"CASH":"Cash","MOBILE":"Mobile"},
  "newRemittance": "New Remittance",
  "amount": "Amount (MRU)",
  "destCountry": "Destination Country",
  "destCurrency": "Destination Currency",
  "mtcn": "MTCN/PIN/Tracking",
  "submit": "Submit",
  "remittances": "Remittances",
  "dashboard": "Dashboard",
  "settings": "Settings",
  "logout": "Logout",
  "policies": "Policies",
  "customerCopy": "Customer Copy",
  "officeCopy": "Office Copy",
  "signature": "Signature",
  "stamp": "Stamp",
  "today": "Today",
  "thisMonth": "This Month",
  "totalCommission": "Total commission",
  "net": "Net"
}`,
  'src/messages/ar.json': `{
  "signIn": "تسجيل الدخول",
  "email": "البريد الإلكتروني",
  "password": "كلمة المرور",
  "providers": {"WU":"ويسترن يونيون","RIA":"ريا","MG":"موني غرام","WAVE":"ويف","OM":"أورانج موني"},
  "channel": {"CASH":"نقدي","MOBILE":"موبايل"},
  "newRemittance": "حوالة جديدة",
  "amount": "المبلغ (MRU)",
  "destCountry": "بلد الوجهة",
  "destCurrency": "عملة الوجهة",
  "mtcn": "MTCN/PIN/تتبع",
  "submit": "حفظ",
  "remittances": "الحوالات",
  "dashboard": "لوحة المؤشرات",
  "settings": "الإعدادات",
  "logout": "خروج",
  "policies": "السياسات",
  "customerCopy": "نسخة الزبون",
  "officeCopy": "نسخة المكتب",
  "signature": "التوقيع",
  "stamp": "الختم",
  "today": "اليوم",
  "thisMonth": "هذا الشهر",
  "totalCommission": "إجمالي عمولتنا",
  "net": "الصافي"
}`,
  'src/styles/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;
@media print { .no-print { display: none; } }`,
  'src/components/Providers.tsx': `"use client";
import { SessionProvider } from 'next-auth/react';
import { NextIntlClientProvider } from 'next-intl';
export default function Providers({ children, session, messages, locale }) {
  return (
    <SessionProvider session={session}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </SessionProvider>
  );
}`,
  'src/components/Nav.tsx': `"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';
export default function Nav({ locale }) {
  const t = useTranslations();
  const pathname = usePathname();
  if (pathname.endsWith('/signin')) return null;
  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  return (
    <nav className="flex gap-4 p-4 bg-gray-100">
      <Link href={'/'+locale+'/dashboard'}>{t('dashboard')}</Link>
      <Link href={'/'+locale+'/remittances'}>{t('remittances')}</Link>
      <Link href={'/'+locale+'/remittances/new'}>{t('newRemittance')}</Link>
      <Link href={'/'+locale+'/settings'}>{t('settings')}</Link>
      <button onClick={()=>signOut()}>{t('logout')}</button>
      <Link href={'/'+otherLocale+pathname.slice(3)} className="ml-auto">{otherLocale.toUpperCase()}</Link>
    </nav>
  );
}`,
  'src/app/[locale]/layout.tsx': `import Providers from '@/components/Providers';
import Nav from '@/components/Nav';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import '../styles/globals.css';
export const dynamic = 'force-dynamic';
export function generateStaticParams() { return [{ locale: 'en' }, { locale: 'ar' }]; }
export default async function RootLayout({ children, params }) {
  const locale = params.locale;
  const messages = (await import('../../messages/'+locale+'.json')).default;
  const session = await getServerSession(authOptions);
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body>
        <Providers session={session} messages={messages} locale={locale}>
          <Nav locale={locale} />
          <div className="p-4">{children}</div>
        </Providers>
      </body>
    </html>
  );
}`,
  'src/app/[locale]/page.tsx': `import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
export default async function Index() {
  const session = await getServerSession(authOptions);
  if (session) redirect('dashboard');
  else redirect('signin');
}`,
  'src/app/[locale]/(auth)/signin/page.tsx': `"use client";
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function SignIn() {
  const t = useTranslations();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const router = useRouter();
  async function submit(e){
    e.preventDefault();
    const res = await signIn('credentials',{redirect:false,email,password});
    if(res?.ok) router.push('../dashboard');
  }
  return (
    <form onSubmit={submit} className="max-w-sm mx-auto mt-24 flex flex-col gap-2">
      <label>{t('email')}</label>
      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="border p-2"/>
      <label>{t('password')}</label>
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="border p-2"/>
      <button type="submit" className="bg-blue-500 text-white p-2 mt-2">{t('signIn')}</button>
    </form>
  );
}`,
  'src/app/[locale]/dashboard/page.tsx': `import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
export default async function Dashboard(){
  const t = await getTranslations();
  const today = new Date();
  const startOfDay = new Date(today.toISOString().split('T')[0]);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const dailyCount = await prisma.remittance.count({ where: { createdAt: { gte: startOfDay } } });
  const monthlyCount = await prisma.remittance.count({ where: { createdAt: { gte: startOfMonth } } });
  const totalFees = await prisma.remittance.aggregate({_sum:{fee:true}});
  const settings = await prisma.setting.findFirst({where:{id:1}});
  const net = (totalFees._sum.fee || 0) - (settings?.monthlyExpense || 0);
  return (
    <div>
      <h1 className="text-xl mb-4">{t('dashboard')}</h1>
      <p>{t('today')}: {dailyCount}</p>
      <p>{t('thisMonth')}: {monthlyCount}</p>
      <p>{t('totalCommission')}: {totalFees._sum.fee || 0}</p>
      <p>{t('net')}: {net}</p>
    </div>
  );
}`,
  'src/app/[locale]/remittances/new/page.tsx': `import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { getTranslations } from 'next-intl/server';
export default async function NewRemittance(){
  const t = await getTranslations();
  async function create(formData){
    'use server';
    const session = await getServerSession(authOptions);
    if(!session?.user?.email) redirect('/signin');
    const provider = formData.get('provider');
    const channel = formData.get('channel');
    const amount = parseFloat(formData.get('amount'));
    const destCountry = formData.get('destCountry');
    const destCurrency = formData.get('destCurrency');
    const tracking = formData.get('tracking');
    const last = await prisma.remittance.findFirst({orderBy:{internalId:'desc'}});
    const internalId = last ? last.internalId + 1 : 10082025;
    const rate = amount <= 100 ? 0.10 : amount <= 1000 ? 0.04 : 0.03;
    const providerFee = amount * 0.01;
    const fee = amount * rate + providerFee;
    const qr = await QRCode.toDataURL(String(internalId));
    await prisma.remittance.create({
      data:{internalId,provider,channel,amountMRU:amount,destCountry,destCurrency,tracking,fee,providerFee,total:amount+fee,qr,createdBy:{connect:{email:session.user.email}}}
    });
    redirect('../remittances/'+internalId+'/receipt');
  }
  return (
    <form action={create} className="flex flex-col gap-2 max-w-md">
      <label>{t('providers.WU')}</label>
      <select name="provider" className="border p-2">
        <option value="WU">{t('providers.WU')}</option>
        <option value="RIA">{t('providers.RIA')}</option>
        <option value="MG">{t('providers.MG')}</option>
        <option value="WAVE">{t('providers.WAVE')}</option>
        <option value="OM">{t('providers.OM')}</option>
      </select>
      <label>{t('channel.CASH')}</label>
      <select name="channel" className="border p-2">
        <option value="CASH">{t('channel.CASH')}</option>
        <option value="MOBILE">{t('channel.MOBILE')}</option>
      </select>
      <label>{t('amount')}</label>
      <input name="amount" type="number" step="0.01" required className="border p-2"/>
      <label>{t('destCountry')}</label>
      <input name="destCountry" className="border p-2"/>
      <label>{t('destCurrency')}</label>
      <input name="destCurrency" className="border p-2"/>
      <label>{t('mtcn')}</label>
      <input name="tracking" className="border p-2"/>
      <button type="submit" className="bg-blue-500 text-white p-2">{t('submit')}</button>
    </form>
  );
}`,
  'src/app/[locale]/remittances/page.tsx': `import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
export default async function Remittances({ searchParams }){
  const t = await getTranslations();
  const q = searchParams?.q || '';
  const where = q ? {OR:[{internalId: Number(q)||undefined},{tracking:{contains:q}},{provider:q}]} : {};
  const remits = await prisma.remittance.findMany({where,orderBy:{id:'desc'}});
  return (
    <div>
      <form className="mb-4">
        <input name="q" defaultValue={q} placeholder="Search" className="border p-2"/>
        <button type="submit" className="ml-2 p-2 border">{t('submit')}</button>
      </form>
      <table className="w-full border">
        <thead>
          <tr><th>ID</th><th>Provider</th><th>Amount</th><th>Tracking</th><th></th></tr>
        </thead>
        <tbody>
          {remits.map(r=> (
            <tr key={r.id} className="border-t">
              <td>{r.internalId}</td>
              <td>{r.provider}</td>
              <td>{r.amountMRU}</td>
              <td>{r.tracking}</td>
              <td><Link href={'remittances/'+r.internalId+'/receipt'}>Print</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`,
  'src/app/[locale]/remittances/[id]/receipt/page.tsx': `import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
export default async function Receipt({ params }){
  const locale = params.locale;
  const id = parseInt(params.id);
  const remit = await prisma.remittance.findUnique({where:{internalId:id},include:{createdBy:true}});
  if(!remit) notFound();
  const settings = await prisma.setting.findFirst({where:{id:1}});
  const t = await getTranslations();
  return (
    <html lang={locale} dir={locale==='ar'?'rtl':'ltr'}>
      <body onLoad="window.print()" className="p-10 text-sm">
        {[1,2].map(copy=> (
          <div key={copy} className="mb-10">
            <h1 className="text-center text-xl">{settings?.officeName}</h1>
            <p>{settings?.address} - {settings?.phone}</p>
            <h2 className="text-center font-bold">{copy===1?t('customerCopy'):t('officeCopy')}</h2>
            <p>{t('remittances')} #{remit.internalId}</p>
            <p>{t('amount')}: {remit.amountMRU}</p>
            <p>{t('providers.'+remit.provider)}</p>
            <p>{t('mtcn')}: {remit.tracking}</p>
            {copy===1 && (
              <div className="mt-4 text-xs"><pre>{settings?.policies}</pre></div>
            )}
            <div className="h-24 border-t mt-4 flex justify-between">
              <span>{t('signature')}</span>
              <span>{t('stamp')}</span>
            </div>
            <img src={remit.qr} className="w-24 mt-4"/>
          </div>
        ))}
      </body>
    </html>
  );
}`,
  'src/app/[locale]/settings/page.tsx': `import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
export default async function Settings(){
  const t = await getTranslations();
  const session = await getServerSession(authOptions);
  if(session?.user.role !== 'ADMIN') redirect('../dashboard');
  const settings = await prisma.setting.findFirst({where:{id:1}});
  async function update(formData){
    'use server';
    const session = await getServerSession(authOptions);
    if(session?.user.role !== 'ADMIN') return;
    await prisma.setting.upsert({
      where:{id:1},
      update:{
        officeName:formData.get('officeName'),
        address:formData.get('address'),
        phone:formData.get('phone'),
        logoUrl:formData.get('logoUrl'),
        policies:formData.get('policies'),
        monthlyExpense: parseFloat(formData.get('monthlyExpense')||'0')
      },
      create:{
        officeName:formData.get('officeName'),
        address:formData.get('address'),
        phone:formData.get('phone'),
        logoUrl:formData.get('logoUrl'),
        policies:formData.get('policies'),
        monthlyExpense: parseFloat(formData.get('monthlyExpense')||'0')
      }
    });
  }
  return (
    <form action={update} className="flex flex-col gap-2 max-w-md">
      <input name="officeName" defaultValue={settings?.officeName} placeholder="Office name" className="border p-2"/>
      <input name="address" defaultValue={settings?.address} placeholder="Address" className="border p-2"/>
      <input name="phone" defaultValue={settings?.phone} placeholder="Phone" className="border p-2"/>
      <input name="logoUrl" defaultValue={settings?.logoUrl} placeholder="Logo URL" className="border p-2"/>
      <textarea name="policies" defaultValue={settings?.policies} placeholder="Policies" className="border p-2"/>
      <input name="monthlyExpense" defaultValue={settings?.monthlyExpense} placeholder="Monthly Expense" className="border p-2"/>
      <button type="submit" className="bg-blue-500 text-white p-2">{t('submit')}</button>
    </form>
  );
}`
};

for (const [file, content] of Object.entries(files)) {
  writeFile(file, content);
}

console.log('Al Mersal project created. Run npm install, npx prisma generate, npx prisma db push, npm run seed, npm run dev');
