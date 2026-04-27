export const urls = {
  moddedHosting: '/modded-minecraft-server-hosting/',
  seedsList: '/minecraft-seeds/',
  seedAtm10: '/minecraft-seeds/sky-haven-island-atm-10-seed/',
  cartModded: '/cart-modded-new/',
  cart: '/cart',
  billing: 'https://billing.godlike.host/',
};

export const moddedHosting = {
  expectedTitlePart: 'Modded Minecraft Server Hosting',
  expectedModpacks: ['ATM10', 'RLCraft', 'SkyFactory 5', 'Cobblemon'],
  billingCycles: ['monthly', 'quarterly', 'biannually', 'annually'] as const,
};

export const seedPage = {
  title: 'Sky Haven Island',
  modpackId: 'curseforge-925200-7852998',
  seedId: '-214726972146453730',
  playerOptions: ['1-2', '3-5', '6-10', '11-20', '21+'],
};

export const formData = {
  validEmail: 'qa-buyer+playwright@example.com',
  invalidEmail: 'not-an-email',
};
