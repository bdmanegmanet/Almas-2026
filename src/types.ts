export type Config={hostelName:string;hostelAddress:string;developer:string;developerFbUrl:string;hostelLogoUrl:string;currentMonth:string;currentYear:string;defaultMealRate:number;appScriptUrl:string};
export type Border={id:string;name:string;mealCount:number;mealRate:number;mealCost:number;extraCost:number;miscCost:number;totalCost:number;totalDeposit:number;managerReceives:number;borderReceives:number};
export type Rice={id:string;borderName:string;consumedPot:number;extraPot:number;totalCostPot:number;depositPot:number;managerReceivesPot:number;borderReceivesPot:number};
export type Slider={id:string;title:string;url:string};
export type Data={config:Record<string,any>;borders:Border[];rice:Rice[];sliderImages:Slider[]};
