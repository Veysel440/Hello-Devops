import client from "prom-client";
client.register.clear();
process.env.SWAGGER_ENABLED = "false";