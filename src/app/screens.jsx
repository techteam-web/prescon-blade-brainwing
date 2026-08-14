import { Landing } from '../screens/Landing';
import { Menu } from '../screens/Menu';
import { Views } from '../screens/sections/Views';
import { Amenities } from '../screens/sections/Amenities';
import { Plans } from '../screens/sections/Plans';
import { Location } from '../screens/sections/Location';
import { Features } from '../screens/sections/Features';

// Five screens. Every one is statically imported: the incoming screen must be mounted
// and laid out before the transition timeline is built, so a lazy screen still resolving
// would break the Flip measurement in `aperture`.
//
// MapLibre is the one heavy dependency, and it is deferred INSIDE the Location screen
// rather than by deferring the screen — which keeps ~250 kB out of the initial bundle
// without putting a Suspense boundary in the middle of a transition.
export const SECTION_SCREENS = {
  views: Views,
  amenities: Amenities,
  plans: Plans,
  location: Location,
  features: Features,
};

// Stage → component. 'gate' mounts nothing: the gate is an overlay outside the stage,
// and the intro runs on the Landing screen's own elements rather than a separate screen.
export const STAGE_SCREENS = {
  gate: null,
  intro: Landing,
  landing: Landing,
  menu: Menu,
};
