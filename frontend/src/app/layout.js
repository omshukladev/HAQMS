import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata = {
  title: 'HAQMS - Hospital Appointment & Queue Management',
  description: 'Deliberately imperfect queue and scheduling application for assessment purposes.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} font-sans min-h-screen gradient-bg`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
