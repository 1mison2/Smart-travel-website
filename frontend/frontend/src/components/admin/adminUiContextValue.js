import { createContext, useContext } from "react";

export const AdminUiContext = createContext(null);

export function useAdminUi() {
  const value = useContext(AdminUiContext);
  if (!value) {
    throw new Error("useAdminUi must be used within AdminUiProvider");
  }
  return value;
}
