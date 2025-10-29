import routes from '@/config/routes';
import { HomeIcon } from '@/components/icons/home';
import { ProfileIcon } from '@/components/icons/profile';
import { CompassIcon } from '@/components/icons/compass';
import { PlusCircle } from '@/components/icons/plus-circle';

export const defaultMenuItems = [
  { name: 'Home', icon: <HomeIcon />, href: routes.home },
  { name: 'Map Explorer', icon: <CompassIcon />, href: routes.mapExplorer },
  { name: 'Create Spot', icon: <PlusCircle />, href: routes.createSpot },
  { name: 'Leaderboard', icon: <CompassIcon />, href: routes.leaderboard },
  { name: 'Profile', icon: <ProfileIcon />, href: routes.myProfile },
];

export const MinimalMenuItems = defaultMenuItems;
