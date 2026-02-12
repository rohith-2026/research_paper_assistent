import "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    skipAdminLogout?: boolean;
  }
}
