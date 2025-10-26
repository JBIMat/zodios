import express from "express";
import { AddressInfo } from "net";
import { z } from "zod";
import {
  makeApi,
  makeCrudApi,
  mergeApis,
  Zodios,
  parametersBuilder,
  apiBuilder,
  makeErrors,
  makeEndpoint,
  makeParameters,
} from "./index";
import { Assert } from "./utils.types";

const userSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const usersSchema = z.array(userSchema);

describe("makeApi", () => {
  it("should throw on duplicate path", () => {
    expect(() =>
      makeApi([
        {
          method: "get",
          path: "/users",
          alias: "getUsers",
          description: "Get all users",
          response: z.array(userSchema),
        },
        {
          method: "get",
          path: "/users",
          alias: "getUsers2",
          description: "Get all users",
          response: z.array(userSchema),
        },
      ])
    ).toThrow("Zodios: Duplicate path 'get /users'");
  });

  it("should throw on duplicate alias", () => {
    expect(() =>
      makeApi([
        {
          method: "get",
          path: "/users",
          alias: "getUsers",
          description: "Get all users",
          response: z.array(userSchema),
        },
        {
          method: "get",
          path: "/users2",
          alias: "getUsers",
          description: "Get all users",
          response: z.array(userSchema),
        },
      ])
    ).toThrow("Zodios: Duplicate alias 'getUsers'");
  });

  it("should throw on duplicate Body", () => {
    expect(() =>
      makeApi([
        {
          method: "post",
          path: "/users",
          alias: "createUser",
          description: "Create a user",
          parameters: [
            {
              name: "first",
              type: "Body",
              description: "The object to create",
              schema: userSchema.partial(),
            },
            {
              name: "second",
              type: "Body",
              description: "The object to create",
              schema: userSchema.partial(),
            },
          ],
          response: userSchema,
        },
      ])
    ).toThrow("Zodios: Multiple body parameters in endpoint '/users'");
  });

  it("should build with parameters (Path,Query,Body,Header)", () => {
    // get users api with query filter for user name, and path parameter for user id and header parameter for user token
    const optionalTrueSchema = z.boolean().default(true).optional();
    const partialUserSchema = userSchema.partial();
    const bearerSchema = z.string().transform((s) => `Bearer ${s}`);
    const api = makeApi([
      {
        method: "post",
        path: "/users/:id",
        alias: "createtUser",
        description: "Create a user",
        parameters: [
          {
            name: "id",
            type: "Path",
            description: "The user id",
            schema: z.number(),
          },
          {
            name: "homonyms",
            type: "Query",
            description: "Allow homonyms",
            schema: optionalTrueSchema,
          },
          {
            name: "email",
            type: "Query",
            description: "create an email account for the user",
            schema: optionalTrueSchema,
          },
          {
            name: "body",
            type: "Body",
            description: "The object to create",
            schema: partialUserSchema,
          },
          {
            name: "Authorization",
            type: "Header",
            description: "The user token",
            schema: bearerSchema,
          },
          {
            name: "x-custom-header",
            type: "Header",
            description: "A custom header",
            schema: z.string(),
          },
        ],
        response: userSchema,
      },
    ]);
    // check narrowing works
    const test: Assert<
      typeof api,
      [
        {
          method: "post";
          path: "/users/:id";
          alias: "createtUser";
          description: "Create a user";
          parameters: [
            {
              name: "id";
              type: "Path";
              description: string;
              schema: z.ZodNumber;
            },
            {
              name: "homonyms";
              type: "Query";
              description: string;
              schema: typeof optionalTrueSchema;
            },
            {
              name: "email";
              type: "Query";
              description: string;
              schema: typeof optionalTrueSchema;
            },
            {
              name: "body";
              type: "Body";
              description: string;
              schema: typeof partialUserSchema;
            },
            {
              name: "Authorization";
              type: "Header";
              description: string;
              schema: typeof bearerSchema;
            },
            {
              name: "x-custom-header";
              type: "Header";
              description: string;
              schema: z.ZodString;
            }
          ];
          response: typeof userSchema;
        }
      ]
    > = true;
  });
});

describe("parametersBuilder", () => {
  it("should build parameters (Path,Query,Body,Header)", () => {
    // get users api with query filter for user name, and path parameter for user id and header parameter for user token
    const optionalTrueSchema = z.boolean().default(true).optional();
    const partialUserSchema = userSchema.partial();
    const bearerSchema = z.string().transform((s) => `Bearer ${s}`);

    const parameters = parametersBuilder()
      .addParameters("Path", {
        id: z.number(),
      })
      .addQueries({
        homonyms: optionalTrueSchema,
        email: optionalTrueSchema,
      })
      .addBody(partialUserSchema)
      .addHeaders({
        Authorization: bearerSchema,
        "x-custom-header": z.string(),
      })
      .build();

    const test: Assert<
      (typeof parameters)[number],
      | {
          name: "id";
          type: "Path";
          description?: string;
          schema: z.ZodNumber;
        }
      | {
          name: "homonyms";
          type: "Query";
          description?: string;
          schema: typeof optionalTrueSchema;
        }
      | {
          name: "email";
          type: "Query";
          description?: string;
          schema: typeof optionalTrueSchema;
        }
      | {
          name: "body";
          type: "Body";
          description?: string;
          schema: typeof partialUserSchema;
        }
      | {
          name: "Authorization";
          type: "Header";
          description?: string;
          schema: typeof bearerSchema;
        }
      | {
          name: "x-custom-header";
          type: "Header";
          description?: string;
          schema: z.ZodString;
        }
    > = true;
  });

  it("should build parameters using addQuery", () => {
    const params = parametersBuilder()
      .addQuery("search", z.string())
      .addQuery("page", z.number())
      .build();

    expect(params).toHaveLength(2);
    expect(params[0]).toMatchObject({
      name: "search",
      type: "Query",
      schema: expect.any(Object),
    });
    expect(params[1]).toMatchObject({
      name: "page",
      type: "Query",
      schema: expect.any(Object),
    });
  });

  it("should build parameters using addPath", () => {
    const params = parametersBuilder()
      .addPath("id", z.number())
      .addPath("slug", z.string())
      .build();

    expect(params).toHaveLength(2);
    expect(params[0]).toMatchObject({
      name: "id",
      type: "Path",
      schema: expect.any(Object),
    });
  });

  it("should build parameters using addHeader", () => {
    const params = parametersBuilder()
      .addHeader("Authorization", z.string())
      .addHeader("Content-Type", z.string())
      .build();

    expect(params).toHaveLength(2);
    expect(params[0]).toMatchObject({
      name: "Authorization",
      type: "Header",
      schema: expect.any(Object),
    });
  });

  it("should build parameters using addQueries", () => {
    const params = parametersBuilder()
      .addQueries({
        search: z.string(),
        page: z.number(),
        limit: z.number(),
      })
      .build();

    expect(params).toHaveLength(3);
    expect(params.map(p => p.name)).toEqual(["search", "page", "limit"]);
    expect(params.every(p => p.type === "Query")).toBe(true);
  });

  it("should build parameters using addPaths", () => {
    const params = parametersBuilder()
      .addPaths({
        id: z.number(),
        slug: z.string(),
      })
      .build();

    expect(params).toHaveLength(2);
    expect(params.map(p => p.name)).toEqual(["id", "slug"]);
    expect(params.every(p => p.type === "Path")).toBe(true);
  });

  it("should build parameters using addHeaders", () => {
    const params = parametersBuilder()
      .addHeaders({
        Authorization: z.string(),
        "X-API-Key": z.string(),
      })
      .build();

    expect(params).toHaveLength(2);
    expect(params.map(p => p.name)).toEqual(["Authorization", "X-API-Key"]);
    expect(params.every(p => p.type === "Header")).toBe(true);
  });

  it("should chain different parameter types", () => {
    const params = parametersBuilder()
      .addPath("id", z.number())
      .addQuery("search", z.string())
      .addHeader("Authorization", z.string())
      .addBody(z.object({ name: z.string() }))
      .build();

    expect(params).toHaveLength(4);
    expect(params[0].type).toBe("Path");
    expect(params[1].type).toBe("Query");
    expect(params[2].type).toBe("Header");
    expect(params[3].type).toBe("Body");
  });
  
});

describe("makeParameters", () => {
  it("should create parameter definitions", () => {
    const params = makeParameters([
      {
        name: "id",
        type: "Path",
        schema: z.number(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string(),
      },
    ]);

    expect(params).toHaveLength(2);
    expect(params[0].name).toBe("id");
    expect(params[0].type).toBe("Path");
    expect(params[1].name).toBe("search");
    expect(params[1].type).toBe("Query");
  });

  it("should preserve parameter schema", () => {
    const schema = z.string().min(3);
    const params = makeParameters([
      {
        name: "username",
        type: "Query",
        schema: schema,
      },
    ]);

    expect(params[0].schema).toBe(schema);
  });
});

describe("makeErrors", () => {
  it("should create error definitions", () => {
    const errors = makeErrors([
      {
        status: 404,
        schema: z.object({ message: z.string() }),
      },
      {
        status: 500,
        schema: z.object({ error: z.string() }),
      },
    ]);

    expect(errors).toHaveLength(2);
    expect(errors[0].status).toBe(404);
    expect(errors[1].status).toBe(500);
  });

  it("should return errors with correct structure", () => {
    const errors = makeErrors([
      {
        status: 401,
        schema: z.object({ message: z.string() }),
        description: "Unauthorized",
      },
    ]);

    expect(errors[0]).toMatchObject({
      status: 401,
      description: "Unauthorized",
      schema: expect.any(Object),
    });
  });
});

describe("makeCrudApi", () => {
  let app: express.Express;
  let server: ReturnType<typeof app.listen>;
  let port: number;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.get("/users", (req, res) => {
      res.status(200).json([{ id: 1, name: "test" }]);
    });
    app.get("/users/:id", (req, res) => {
      res.status(200).json({ id: Number(req.params.id), name: "test" });
    });
    app.post("/users", (req, res) => {
      res.status(200).json({ id: 1, name: "test" });
    });
    app.put("/users/:id", (req, res) => {
      res.status(200).json({ id: Number(req.params.id), name: req.body.name });
    });
    app.patch("/users/:id", (req, res) => {
      res.status(200).json({ id: Number(req.params.id), name: req.body.name });
    });
    app.delete("/users/:id", (req, res) => {
      res.status(200).json({ id: Number(req.params.id), name: "test" });
    });
    server = app.listen(0);
    port = (server.address() as AddressInfo).port;
  });

  afterAll(() => {
    server.close();
  });

  it("should create a CRUD api definition", () => {
    const api = makeCrudApi("user", userSchema);

    const usersSchema = z.array(userSchema);

    type ExpectedGetEndpoint = {
      method: "get";
      path: "/users";
      alias: "getUsers";
      description: "Get all users";
      response: typeof usersSchema;
    };

    // check narrowing works
    const testGet: Assert<(typeof api)[0], ExpectedGetEndpoint> = true;

    expect(JSON.stringify(api)).toEqual(
      JSON.stringify([
        {
          method: "get",
          path: "/users",
          alias: "getUsers",
          description: "Get all users",
          response: z.array(userSchema),
        },
        {
          method: "get",
          path: "/users/:id",
          alias: "getUser",
          description: "Get a user",
          response: userSchema,
        },
        {
          method: "post",
          path: "/users",
          alias: "createUser",
          description: "Create a user",
          parameters: [
            {
              name: "body",
              type: "Body",
              description: "The object to create",
              schema: userSchema.partial(),
            },
          ],
          response: userSchema,
        },
        {
          method: "put",
          path: "/users/:id",
          alias: "updateUser",
          description: "Update a user",
          parameters: [
            {
              name: "body",
              type: "Body",
              description: "The object to update",
              schema: userSchema,
            },
          ],
          response: userSchema,
        },
        {
          method: "patch",
          path: "/users/:id",
          alias: "patchUser",
          description: "Patch a user",
          parameters: [
            {
              name: "body",
              type: "Body",
              description: "The object to patch",
              schema: userSchema.partial(),
            },
          ],
          response: userSchema,
        },
        {
          method: "delete",
          path: "/users/:id",
          alias: "deleteUser",
          description: "Delete a user",
          response: userSchema,
        },
      ])
    );
  });

  it("should get one user", async () => {
    const api = makeCrudApi("user", userSchema);
    const client = new Zodios(`http://localhost:${port}`, api);
    const user = await client.getUser({ params: { id: 1 } });
    expect(user).toEqual({ id: 1, name: "test" });
  });

  it("should get all users", async () => {
    const api = makeCrudApi("user", userSchema);
    const client = new Zodios(`http://localhost:${port}`, api);
    const users = await client.getUsers();
    expect(users).toEqual([{ id: 1, name: "test" }]);
  });

  it("should create a user", async () => {
    const api = makeCrudApi("user", userSchema);
    const client = new Zodios(`http://localhost:${port}`, api);
    const user = await client.createUser({ name: "test" });
    expect(user).toEqual({ id: 1, name: "test" });
  });

  it("should update a user", async () => {
    const api = makeCrudApi("user", userSchema);
    const client = new Zodios(`http://localhost:${port}`, api);
    const user = await client.updateUser(
      { id: 2, name: "test2" },
      { params: { id: 2 } }
    );
    expect(user).toEqual({ id: 2, name: "test2" });
  });

  it("should patch a user", async () => {
    const api = makeCrudApi("user", userSchema);
    const client = new Zodios(`http://localhost:${port}`, api);
    const user = await client.patchUser(
      { name: "test2" },
      { params: { id: 2 } }
    );
    expect(user).toEqual({ id: 2, name: "test2" });
  });

  it("should delete a user", async () => {
    const api = makeCrudApi("user", userSchema);
    const client = new Zodios(`http://localhost:${port}`, api);
    const user = await client.deleteUser(undefined, { params: { id: 2 } });
    expect(user).toEqual({ id: 2, name: "test" });
  });
});

describe("mergeApis", () => {
  it("should merge two apis", () => {
    const usersSchema = z.array(userSchema);
    const api1 = makeApi([
      {
        method: "get",
        path: "/",
        alias: "getUsers",
        description: "Get all users",
        response: usersSchema,
      },
      {
        method: "get",
        path: "/:id",
        alias: "getUser",
        description: "Get a user",
        response: userSchema,
      },
    ]);

    const api2 = makeApi([
      {
        method: "get",
        path: "/",
        alias: "getAdmins",
        description: "Get all admins",
        response: usersSchema,
      },
    ]);
    const merged = mergeApis({
      "/users": api1,
      "/admins": api2,
    });
    expect(merged).toHaveLength(3);
    expect(merged[0].path).toEqual("/users");
    expect(merged[1].path).toEqual("/users/:id");
    expect(merged[2].path).toEqual("/admins");
    const test1: Assert<
      typeof merged,
      [
        {
          method: "get";
          path: "/users";
          alias: "getUsers";
          description: "Get all users";
          response: typeof usersSchema;
        },
        {
          method: "get";
          path: "/users/:id";
          alias: "getUser";
          description: "Get a user";
          response: typeof userSchema;
        },
        {
          method: "get";
          path: "/admins";
          alias: "getAdmins";
          description: "Get all admins";
          response: typeof usersSchema;
        }
      ]
    > = true;
  });
});

describe("apiBuilder", () => {
  it("should build an empty api", () => {
    const api = apiBuilder().build();
    const test: Assert<typeof api, []> = true;
    expect(api).toEqual([]);
  });

  it("should build an api with one endpoint and empty first endpoint", () => {
    const api = apiBuilder()
      .addEndpoint({
        method: "get",
        path: "/users",
        alias: "getUsers",
        description: "Get all users",
        response: usersSchema,
      })
      .build();
    const test: Assert<
      typeof api,
      [
        {
          method: "get";
          path: "/users";
          alias: "getUsers";
          description: "Get all users";
          response: typeof usersSchema;
        }
      ]
    > = true;
    expect(api).toEqual([
      {
        method: "get",
        path: "/users",
        alias: "getUsers",
        description: "Get all users",
        response: usersSchema,
      },
    ]);
  });

  it("should build an api with two endpoint and empty first endpoint", () => {
    const api = apiBuilder()
      .addEndpoint({
        method: "get",
        path: "/users",
        alias: "getUsers",
        description: "Get all users",
        response: usersSchema,
      })
      .addEndpoint({
        method: "get",
        path: "/users/:id",
        alias: "getUser",
        description: "Get a user",
        response: userSchema,
      })
      .build();
    const test: Assert<
      typeof api,
      [
        {
          method: "get";
          path: "/users";
          alias: "getUsers";
          description: "Get all users";
          response: typeof usersSchema;
        },
        {
          method: "get";
          path: "/users/:id";
          alias: "getUser";
          description: "Get a user";
          response: typeof userSchema;
        }
      ]
    > = true;
    expect(api).toEqual([
      {
        method: "get",
        path: "/users",
        alias: "getUsers",
        description: "Get all users",
        response: usersSchema,
      },
      {
        method: "get",
        path: "/users/:id",
        alias: "getUser",
        description: "Get a user",
        response: userSchema,
      },
    ]);
  });

  it("should build an api with one endpoint", () => {
    const api = apiBuilder({
      method: "get",
      path: "/users",
      alias: "getUsers",
      description: "Get all users",
      response: usersSchema,
    }).build();
    const test: Assert<
      typeof api,
      [
        {
          method: "get";
          path: "/users";
          alias: "getUsers";
          description: "Get all users";
          response: typeof usersSchema;
        }
      ]
    > = true;
    expect(api).toEqual([
      {
        method: "get",
        path: "/users",
        alias: "getUsers",
        description: "Get all users",
        response: usersSchema,
      },
    ]);
  });

  it("should create builder with no initial endpoint", () => {
    const builder = apiBuilder();
    const api = builder
      .addEndpoint({
        method: "get",
        path: "/test",
        response: z.string(),
      })
      .build();

    expect(api).toHaveLength(1);
    expect(api[0].path).toBe("/test");
  });

  it("should create builder with initial endpoint", () => {
    const builder = apiBuilder({
      method: "get",
      path: "/initial",
      response: z.string(),
    });

    const api = builder
      .addEndpoint({
        method: "post",
        path: "/second",
        response: z.string(),
      })
      .build();

    expect(api).toHaveLength(2);
    expect(api[0].path).toBe("/initial");
    expect(api[1].path).toBe("/second");
  });

  it("should handle adding endpoint to empty api", () => {
    const builder = new (apiBuilder().constructor as any)([]);
    const newBuilder = builder.addEndpoint({
      method: "get",
      path: "/test",
      response: z.string(),
    });

    expect(newBuilder).toBeDefined();
  });
});

describe("makeEndpoint", () => {
  it("should create a single endpoint definition", () => {
    const endpoint = makeEndpoint({
      method: "get",
      path: "/test",
      response: z.object({ id: z.number() }),
      description: "Test endpoint",
    });

    expect(endpoint).toMatchObject({
      method: "get",
      path: "/test",
      description: "Test endpoint",
    });
  });

  it("should preserve endpoint parameters", () => {
    const endpoint = makeEndpoint({
      method: "post",
      path: "/users",
      parameters: [
        {
          name: "body",
          type: "Body",
          schema: z.object({ name: z.string() }),
        },
      ],
      response: z.object({ id: z.number() }),
    });

    expect(endpoint.parameters).toHaveLength(1);
    expect(endpoint.parameters![0].name).toBe("body");
  });
});