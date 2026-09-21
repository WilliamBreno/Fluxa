const NOME_BANCO = "fluxa-offline";
const VERSAO_BANCO = 1;

export const STORE_FILA = "filaOperacoes";
export const STORE_REJEITADAS = "filaRejeitadas";
export const STORE_CACHE = "cache";

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Wrapper fino sobre IndexedDB nativa — sem dependência nova. São só 3
 * object stores e um punhado de operações, uma lib como `idb` não compensa.
 */
export function abrirDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB não disponível neste navegador."));
      return;
    }
    const request = indexedDB.open(NOME_BANCO, VERSAO_BANCO);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_FILA)) {
        db.createObjectStore(STORE_FILA, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_REJEITADAS)) {
        db.createObjectStore(STORE_REJEITADAS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: "chave" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function put<T>(store: string, valor: T): Promise<void> {
  const db = await abrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(valor);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function obter<T>(store: string, chave: string): Promise<T | undefined> {
  const db = await abrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(chave);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function listarTudo<T>(store: string): Promise<T[]> {
  const db = await abrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function remover(store: string, chave: string): Promise<void> {
  const db = await abrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(chave);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
