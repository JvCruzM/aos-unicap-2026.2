export const validate = (schema) => async (req, res, next) => {
  const data = await schema.parseAsync({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  for (const key of ["body", "params", "query"]) {
    if (Object.hasOwn(data, key)) {
      if (key === "query") {
        Object.defineProperty(req, key, {
          value: data[key],
          writable: true,
          enumerable: true,
          configurable: true,
        });
      } else {
        req[key] = data[key];
      }
    }
  }

  next();
};

export default validate;
