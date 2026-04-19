import 'react';

declare global {
  interface PdfJsWorkerState {
    WorkerMessageHandler?: object;
  }

  var pdfjsWorker: PdfJsWorkerState | undefined;
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface InputHTMLAttributes<T> {
    directory?: string;
    webkitdirectory?: string;
  }
}

export {};
