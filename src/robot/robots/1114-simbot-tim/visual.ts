import type {RobotVisualDefinition} from '../../types';
import {STANDARD_VISUAL} from '../../defaults';
const FEEDER_NODES=["feeder-roller-1007--1144","feeder-roller-1034-1116","feeder-roller-1035-1116","feeder-roller-1246-1696","feeder-roller-1457-2276","feeder-roller-1626--1751","feeder-roller-1668-2857","feeder-roller-2451--2022","feeder-roller-2619--118","feeder-roller-3224--2096","feeder-roller-3224--343","feeder-roller-3266-134","feeder-roller-3816--2096","feeder-roller-3816--343","feeder-roller-4134-195","feeder-roller-4408--2096","feeder-roller-4408--343","feeder-roller-5001--2096","feeder-roller-5001--343","feeder-roller-5002-255","feeder-roller-719--326","feeder-roller-823-536"];
export const TIM_VISUAL:RobotVisualDefinition={
 ...STANDARD_VISUAL,numberSize:[.28,.08],
 requiredNodes:[...FEEDER_NODES,'chassis','intake','hood','shooter-drum','intake-roller-lower','intake-roller-upper','hood-roller-0','hood-roller-1','hood-roller-2'],
 poseNodes:{intake:'intake',hood:'hood'},
 spin:[
  {prefix:'intake-roller-',source:'intake',factor:1,axis:'z'},
  {prefix:'feeder-roller-',source:'feeder',factor:-1,axis:'z'},
  {node:'shooter-drum',source:'shooter',factor:-1,axis:'z'},
  {prefix:'hood-roller-',source:'shooter',factor:1,axis:'z'},
 ],
};
