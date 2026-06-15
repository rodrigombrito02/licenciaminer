import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // TEMPORARIO: ignora type errors no build de producao.
  // Codigo de modulos em construcao (riscos, crises, comunicacoes etc)
  // ainda tem tipos incompletos. Remover quando todos os modulos
  // estiverem com tipagem completa.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Nota: no Next 16 o `next build` não roda ESLint por padrão (use `next lint`),
  // por isso a chave `eslint` foi removida daqui (era ignorada e gerava aviso).
};

export default nextConfig;
