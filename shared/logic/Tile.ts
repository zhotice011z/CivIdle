import type { Building } from "../definitions/BuildingDefinitions";
import type { Deposit, Resource } from "../definitions/ResourceDefinitions";
import { clamp, isNullOrUndefined, type Tile } from "../utilities/Helper";
import type { PartialSet, PartialTabulate } from "../utilities/TypeDefinitions";
import { L, t } from "../utilities/i18n";
import { Config } from "./Config";
import type { GameState } from "./GameState";

export interface ITileData {
   tile: Tile;
   explored: boolean;
   deposit: PartialSet<Deposit>;
   building?: IBuildingData;
}

export type BuildingStatus = "building" | "upgrading" | "completed";

export enum BuildingOptions {
   None = 0,
}

export enum BuildingInputMode {
   Distance = 0,
   Amount = 1,
   StoragePercentage = 2,
}

export const BuildingInputModeNames: Map<BuildingInputMode, () => string> = new Map([
   [BuildingInputMode.Distance, () => t(L.TechResourceTransportPreferenceDistance)],
   [BuildingInputMode.Amount, () => t(L.TechResourceTransportPreferenceAmount)],
   [BuildingInputMode.StoragePercentage, () => t(L.TechResourceTransportPreferenceStorage)],
]);

export const BuildingInputModeTooltips: Map<BuildingInputMode, () => string> = new Map([
   [BuildingInputMode.Distance, () => t(L.TechResourceTransportPreferenceDistanceTooltip)],
   [BuildingInputMode.Amount, () => t(L.TechResourceTransportPreferenceAmountTooltip)],
   [BuildingInputMode.StoragePercentage, () => t(L.TechResourceTransportPreferenceStorageTooltip)],
]);

export enum SuspendedInput {
   AutoSuspended = 0,
   ManualSuspended = 1,
}

export interface IBuildingData {
   type: Building;
   level: number;
   desiredLevel: number;
   resources: PartialTabulate<Resource>;
   status: BuildingStatus;
   capacity: number;

   stockpileCapacity: number;
   stockpileMax: number;

   productionPriority: number;
   constructionPriority: number;

   electrification: number;

   options: BuildingOptions;

   suspendedInput: Map<Resource, SuspendedInput>;

   // disabledInput: Set<Resource>;

   inputMode: BuildingInputMode;
   maxInputDistance: number;
}

export enum MarketOptions {
   None = 0,
   ClearAfterUpdate = 1 << 0,
   UniqueTrades = 1 << 1,
   ForceUpdateOnce = 1 << 2,
}

export interface IMarketBuildingData extends IBuildingData {
   sellResources: PartialSet<Resource>;
   availableResources: Partial<Record<Resource, Resource>>;
   marketOptions: MarketOptions;
}

export interface IResourceImport {
   perCycle: number;
   cap: number;
   inputMode?: BuildingInputMode;
}

export enum ResourceImportOptions {
   None = 0,
   ExportBelowCap = 1 << 0,
   ExportToSameType = 1 << 1,
}

export interface IResourceImportBuildingData extends IBuildingData {
   resourceImportOptions: ResourceImportOptions;
   resourceImports: Partial<Record<Resource, IResourceImport>>;
}

export enum WarehouseOptions {
   None = 0,
   Autopilot = 1 << 0,
   AutopilotRespectCap = 1 << 1,
}

export interface IWarehouseBuildingData extends IResourceImportBuildingData {
   warehouseOptions: WarehouseOptions;
}

export enum PetraOptions {
   None = 0,
   TimeWarp = 1 << 0,
}

export interface IPetraBuildingData extends IBuildingData {
   speedUp: number;
   offlineProductionPercent: number;
}

export type IHaveTypeAndLevel = Pick<IBuildingData, "type" | "level">;

export const STOCKPILE_CAPACITY_MIN = 0;
export const STOCKPILE_CAPACITY_MAX = 10;

export const STOCKPILE_MAX_MIN = 0;
export const STOCKPILE_MAX_MAX = 50;

export const PRIORITY_MIN = 1;
export const PRIORITY_MAX = 10;

export const DEFAULT_STOCKPILE_CAPACITY = 1;
export const DEFAULT_STOCKPILE_MAX = 5;

export function makeBuilding(data: Pick<IBuildingData, "type"> & Partial<IBuildingData>): IBuildingData {
   const building: IBuildingData = {
      level: 0,
      desiredLevel: 1,
      resources: {},
      status: "building",
      capacity: 1,
      stockpileCapacity: DEFAULT_STOCKPILE_CAPACITY,
      stockpileMax: DEFAULT_STOCKPILE_MAX,
      options: BuildingOptions.None,
      electrification: 0,
      suspendedInput: new Map(),
      inputMode: BuildingInputMode.Distance,
      maxInputDistance: Infinity,
      productionPriority: PRIORITY_MIN,
      constructionPriority: PRIORITY_MIN,
      ...data,
   };

   switch (building.type) {
      case "Market": {
         const market = building as IMarketBuildingData;
         if (!market.sellResources) {
            market.sellResources = {};
         }
         if (!market.availableResources) {
            market.availableResources = {};
         }
         if (isNullOrUndefined(market.marketOptions)) {
            market.marketOptions = MarketOptions.None;
         }
         break;
      }
      case "Caravansary": {
         const trade = building as IResourceImportBuildingData;
         if (!trade.resourceImports) {
            trade.resourceImports = {};
         }
         if (isNullOrUndefined(trade.resourceImportOptions)) {
            trade.resourceImportOptions = ResourceImportOptions.None;
         }
         break;
      }
      case "Warehouse": {
         const warehouse = building as IWarehouseBuildingData;
         if (!warehouse.resourceImports) {
            warehouse.resourceImports = {};
         }
         if (isNullOrUndefined(warehouse.warehouseOptions)) {
            warehouse.warehouseOptions = WarehouseOptions.None;
         }
         if (isNullOrUndefined(warehouse.resourceImportOptions)) {
            warehouse.resourceImportOptions = ResourceImportOptions.None;
         }
         break;
      }
      case "Petra": {
         const petra = building as IPetraBuildingData;
         if (isNullOrUndefined(petra.speedUp)) {
            petra.speedUp = 1;
         }
         if (isNullOrUndefined(petra.offlineProductionPercent)) {
            petra.offlineProductionPercent = 1;
         }
      }
   }

   building.stockpileCapacity = clamp(
      building.stockpileCapacity,
      STOCKPILE_CAPACITY_MIN,
      STOCKPILE_CAPACITY_MAX,
   );
   building.stockpileMax = clamp(building.stockpileMax, STOCKPILE_MAX_MIN, STOCKPILE_MAX_MAX);
   building.productionPriority = clamp(building.productionPriority, PRIORITY_MIN, PRIORITY_MAX);
   building.constructionPriority = clamp(building.constructionPriority, PRIORITY_MIN, PRIORITY_MAX);
   return building;
}

export function getDepositTileCount(deposit: Deposit, gs: GameState): number {
   const city = Config.City[gs.city];
   const tiles = city.size * city.size;
   return Math.round(tiles * city.deposits[deposit]);
}
