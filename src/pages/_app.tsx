import type { AppProps } from 'next/app';
import { Provider } from '@/components/ui/provider';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider>
      <Component {...pageProps} />
    </Provider>
  );
}
