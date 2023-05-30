import { createLocalStorage } from "@solid-primitives/storage";
export const [storage, setStorage] = createLocalStorage();

export const account = () => storage.account;
export const setAccount = (id: string) => setStorage("account", id);
