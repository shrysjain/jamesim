import type {RobotVisualDefinition} from '../../types';
import {STANDARD_VISUAL} from '../../defaults';
export const ICARUS_VISUAL:RobotVisualDefinition={
 ...STANDARD_VISUAL,
 requiredNodes:['chassis','intake','opposed-intake','turret','turret-hood','dye-rotor','shooter-drum',
  'intake-roller-left-upper','intake-roller-left-lower','intake-roller-right-upper','intake-roller-right-lower',
  'hood-roller-upper','hood-roller-lower','feeder-roller-vertical','feeder-roller-upper'],
 poseNodes:{intake:'intake',opposedIntake:'opposed-intake'},turret:'turret',turretHood:'turret-hood',
 // These real shafts have independent centers. Never rotate a whole feeder tower
 // about one roller, or a cylinder will orbit vertically when Space is held.
 spin:[
  {prefix:'intake-roller-left-',source:'intake',factor:1},
  {prefix:'intake-roller-right-',source:'intake',factor:-1},
  {node:'dye-rotor',source:'feeder',factor:.125,axis:'y'},
  {node:'feeder-roller-vertical',source:'feeder',factor:1,axis:'y'},
  {node:'feeder-roller-upper',source:'feeder',factor:1,axis:'x'},
  {node:'shooter-drum',source:'shooter',factor:-1,axis:'z'},
  {prefix:'hood-roller-',source:'shooter',factor:1,axis:'z'},
 ],numberSize:[.295,.083],
};
