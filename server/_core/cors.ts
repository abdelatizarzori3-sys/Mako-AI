const capacitorOrigins = ["http://localhost", "https://localhost", "capacitor://localhost"];
const browserOrigins = ["https://abdelatizarzori3-sys.github.io"];

export function getAllowedOrigins(configuredOrigins = process.env.ALLOWED_ORIGINS || "") {
  return new Set([
    ...browserOrigins,
    ...capacitorOrigins,
    ...configuredOrigins
      .split(",")
      .map(origin => origin.trim())
      .filter(Boolean),
  ]);
}
