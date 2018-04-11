export default {
  CITY: {
    UPDATE: 'CITY_UPDATE',
  },
  NODE: {
    BATCH_UPDATE: 'NODE_BATCH_UPDATE',
  },
  ROAD: {
    BATCH_UPDATE: 'ROAD_BATCH_UPDATE',
  },
  PLAN: {
    BATCH_UPDATE: 'PLAN_BATCH_UPDATE',
  },
  WORKING_PLAN: {
    NAME: {
      CHANGE: 'WORKING_PLAN_NAME_CHANGE',
    },
    PLAN_TYPE: {
      CHANGE: 'WORKING_PLAN_TYPE_CHANGE',
    },
    TIMEFRAME: {
      ADD: 'WORKING_PLAN_TIMEFRAME_ADD',
      REMOVE: 'WORKING_PLAN_TIMEFRAME_REMOVE',
      START: {
        CHANGE: 'WORKING_PLAN_TIMEFRAME_START_CHANGE',
      },
      END: {
        CHANGE: 'WORKING_PLAN_TIMEFRAME_END_CHANGE',
      },
      SEGMENT: {
        ADD: 'WORKING_PLAN_TIMEFRAME_SEGMENT_ADD',
        REMOVE: 'WORKING_PLAN_TIMEFRAME_SEGMENT_REMOVE',
        ROAD: {
          CHANGE: 'WORKING_PLAN_SEGMENT_ROAD_CHANGE',
        },
        IS_SEGMENT: {
          CHANGE: 'WORKING_PLAN_SEGMENT_IS_SEGMENT_CHANGE',
        },
        END_POINT: {
          CHANGE: 'WORKING_PLAN_SEGMENT_END_POINT_CHANGE',
        },
      },
    },
  },
};
