const routes = {
  home: '/',
  retro: '/retro',
  // SkateBounties routes only
  mapExplorer: '/retro/map-explorer',
  spotDetail: (id: string) => `/retro/spot/${id}`,
  createSpot: '/retro/create-spot',
  myProfile: '/retro/profile',
  leaderboard: '/retro/leaderboard',
};

export default routes;
