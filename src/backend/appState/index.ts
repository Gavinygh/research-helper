import { db, AppState } from "../database";
import { LayoutConfig } from "golden-layout";
import { debounce } from "quasar";

/*****************************
 * App State
 *****************************/

async function getAppState(): Promise<AppState> {
  try {
    return await db.get("appState");
  } catch (error) {
    // cannot get appState

    let state: AppState = {
      _id: "appState",
      dataType: "appState",
      leftMenuSize: 20,
      showLeftMenu: false,
      selectedFolderId: "library",
      workingItemId: "",
      openedProjectIds: [],
      settings: {
        theme: "dark",
        language: "en_US",
        storagePath: "",
        fontSize: "16px",
      },
    };
    await db.put(state);
    return state;
  }
}

async function _updateAppState(state: AppState) {
  let oldState = await db.get("appState");
  state._rev = oldState._rev;
  await db.put(state);
}

const updateAppState = debounce(_updateAppState, 200);

/*****************************
 * Layout
 *****************************/

async function getLayout() {
  try {
    return await db.get("layout");
  } catch (error) {
    // cannot get layout
    let layout = {
      _id: "layout",
      dataType: "layout",
      config: {
        settings: {
          showPopoutIcon: false,
          showMaximiseIcon: false,
          // must have close icon otherwise the last tab can't close
          showCloseIcon: true,
        },
        dimensions: {
          borderWidth: 3,
          headerHeight: 36,
        },
        root: {
          type: "stack",
          content: [
            {
              type: "component",
              title: "Library",
              componentType: "LibraryPage",
              componentState: { id: "library" },
            },
          ],
        },
      },
    };

    await db.put(layout);
    return layout;
  }
}

async function _updateLayout(config: LayoutConfig) {
  let layout: any = await db.get("layout");
  layout.config = config;
  await db.put(layout);
}

const updateLayout = debounce(_updateLayout, 200);

export { getLayout, updateLayout, getAppState, updateAppState };
