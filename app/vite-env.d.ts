// Vite の型定義を TypeScript に適用するためのディレクティブ
/// <reference types="vite/client" />

// 環境変数の型定義を行うインターフェース
// VITE_ で始まる環境変数を定義し、型安全にアクセスできるようにする
interface ImportMetaEnv {
    readonly VITE_APP_NAME: string; // アプリケーション名の環境変数
    // 他の環境変数を追加する場合は、ここに定義
}

// import.meta オブジェクトに env を追加し、型情報を提供するインターフェース
interface ImportMeta {
    readonly env: ImportMetaEnv; // 環境変数を含むオブジェクト
}
