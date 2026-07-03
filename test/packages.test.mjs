import test from "node:test";
import assert from "node:assert/strict";
import { buildDefaultPackages } from "../src/packages.mjs";

test("buildDefaultPackages creates scene packages using catalog product ids", () => {
  const catalog = [
    { id: "product_sony_ilme_fx3", name: "Sony ILME-FX3" },
    { id: "product_atem_constellation_8k", name: "ATEM Constellation 8K（BMD 4M/E 8K切换台）" },
    { id: "product_sony_uwp_d21", name: "Sony UWP-D21领夹麦克风（一拖一）" },
    { id: "product_router", name: "路由器" },
    { id: "product_director_4_6", name: "导播（4-6）" },
    { id: "product_camera_operator", name: "固定机位摄影师" },
  ];

  const packages = buildDefaultPackages(catalog);
  const basic = packages.find((item) => item.packageId === "pkg_basic_2_camera");

  assert.equal(packages.length >= 4, true);
  assert.equal(basic.name, "2机位基础套餐");
  assert.equal(basic.items.some((item) => item.productId === "product_sony_ilme_fx3"), true);
  assert.equal(basic.items.some((item) => item.productId === "product_director_4_6"), true);
});
