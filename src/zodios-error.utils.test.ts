import { AxiosError } from "axios";
import { z } from "zod";
import { isErrorFromPath, isErrorFromAlias } from "./zodios-error.utils";
import { makeApi } from "./api";

describe("zodios-error.utils", () => {
  const api = makeApi([
    {
      method: "get",
      path: "/users/:id",
      alias: "getUser",
      response: z.object({ id: z.number(), name: z.string() }),
      errors: [
        {
          status: 404,
          schema: z.object({ message: z.string() }),
        },
        {
          status: 500,
          schema: z.object({ error: z.string() }),
        },
      ],
    },
    {
      method: "post",
      path: "/users",
      alias: "createUser",
      response: z.object({ id: z.number() }),
      errors: [
        {
          status: 400,
          schema: z.object({ validation: z.string() }),
        },
      ],
    },
  ]);

  describe("isErrorFromPath", () => {
    it("should return true for matching error", () => {
        const error = new AxiosError("Not found");
        error.response = {
            status: 404,
            data: { message: "User not found" },
            statusText: "Not Found",
            headers: {},
            config: {
            url: "/users/123",
            method: "get",
            } as any,
        };
        error.config = {
            url: "/users/123",
            method: "get",
        } as any;

        expect(isErrorFromPath(api, "get", "/users/:id", error)).toBe(true);
        });

    it("should return false for non-matching error data", () => {
      const error = new AxiosError("Not found");
      error.response = {
        status: 404,
        data: { wrongField: "value" },
        statusText: "Not Found",
        headers: {},
        config: {} as any,
      };

      expect(isErrorFromPath(api, "get", "/users/:id", error)).toBe(false);
    });

    it("should return false for error without response", () => {
      const error = new AxiosError("Network error");

      expect(isErrorFromPath(api, "get", "/users/:id", error)).toBe(false);
    });

    it("should return false for non-axios error", () => {
      const error = new Error("Regular error");

      expect(isErrorFromPath(api, "get", "/users/:id", error)).toBe(false);
    });

    it("should return false for non-error object", () => {
      const error = "string error";

      expect(isErrorFromPath(api, "get", "/users/:id", error)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isErrorFromPath(api, "get", "/users/:id", null)).toBe(false);
    });

    it("should return false when endpoint has no error definitions", () => {
      const apiNoErrors = makeApi([
        {
          method: "get",
          path: "/test",
          response: z.object({ id: z.number() }),
        },
      ]);

      const error = new AxiosError("Error");
      error.response = {
        status: 500,
        data: { message: "error" },
        statusText: "Error",
        headers: {},
        config: {} as any,
      };

      expect(isErrorFromPath(apiNoErrors, "get", "/test", error)).toBe(false);
    });

    it("should handle error-like objects with isAxiosError", () => {
        const errorLike: any = {
            isAxiosError: true,
            response: {
            status: 404,
            data: { message: "Not found" },
            statusText: "Not Found",
            headers: {},
            config: {
                url: "/users/123",  // ← Add the actual request URL
                method: "get",
            },
            },
            message: "Request failed",
            name: "AxiosError",
            config: {
            url: "/users/123",  // ← Add here too
            method: "get",
            },
            toJSON: () => ({}),
        };

        const result = isErrorFromPath(api, "get", "/users/:id", errorLike);
        expect(result).toBe(true);
        });
  });

  describe("isErrorFromAlias", () => {
    it("should return true for matching error by alias", () => {
        const error = new AxiosError("Not found");
        error.response = {
            status: 404,
            data: { message: "User not found" },
            statusText: "Not Found",
            headers: {},
            config: {
            url: "/users/123",
            method: "get",
            } as any,
        };
        error.config = {
            url: "/users/123",
            method: "get",
        } as any;

        expect(isErrorFromAlias(api, "getUser", error)).toBe(true);
        });

        it("should handle multiple error schemas", () => {
        const error500 = new AxiosError("Server error");
        error500.response = {
            status: 500,
            data: { error: "Internal server error" },
            statusText: "Internal Server Error",
            headers: {},
            config: {
            url: "/users/123",
            method: "get",
            } as any,
        };
        error500.config = {
            url: "/users/123",
            method: "get",
        } as any;

        expect(isErrorFromAlias(api, "getUser", error500)).toBe(true);

        const error404 = new AxiosError("Not found");
        error404.response = {
            status: 404,
            data: { message: "Not found" },
            statusText: "Not Found",
            headers: {},
            config: {
            url: "/users/123",
            method: "get",
            } as any,
        };
        error404.config = {
            url: "/users/123",
            method: "get",
        } as any;

        expect(isErrorFromAlias(api, "getUser", error404)).toBe(true);
        });
    it("should return false for non-matching error data by alias", () => {
      const error = new AxiosError("Bad request");
      error.response = {
        status: 400,
        data: { wrongField: "value" },
        statusText: "Bad Request",
        headers: {},
        config: {} as any,
      };

      expect(isErrorFromAlias(api, "createUser", error)).toBe(false);
    });

    it("should return false for error without response by alias", () => {
      const error = new AxiosError("Network error");

      expect(isErrorFromAlias(api, "getUser", error)).toBe(false);
    });

    it("should return false for non-axios error by alias", () => {
      const error = new Error("Regular error");

      expect(isErrorFromAlias(api, "getUser", error)).toBe(false);
    });

    it("should return false for null by alias", () => {
      expect(isErrorFromAlias(api, "getUser", null)).toBe(false);
    });

  });
});