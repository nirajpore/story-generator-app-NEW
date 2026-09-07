import './globals.css';

export const metadata = {
  title: 'Personal Reading Coach',
  description: 'Private mobile-first AI reading coach for one child and parents',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  );
}
