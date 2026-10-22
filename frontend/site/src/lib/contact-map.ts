// 办公地址：浙江省温州市平阳县昆阳镇雅河路189号（平阳大厦）。
// 位置来源：https://m.fang.com/map/xf/wz/2012852904/ditu.htm
// 源坐标为 BD-09：120.57052612304688, 27.670446395874023；
// 经 BD-09 → GCJ-02 → WGS84 转换后用于 Bing 底图，不能直接混用。
export const OFFICE_LOCATION = {
  longitude: 120.560075,
  latitude: 27.667912,
} as const;

// map-pingyang-city.jpg 为 Bing z15 瓦片拼接后以办公地址居中裁切的城区地图。
// originX/Y 为裁切左上角的世界像素坐标，必须与图片同步更新。
const MAP = { zoom: 15, originX: 7002789, originY: 3522715, width: 1536, height: 512 };

export function officeMapPosition() {
  const worldSize = 256 * 2 ** MAP.zoom;
  const sinLatitude = Math.sin((OFFICE_LOCATION.latitude * Math.PI) / 180);
  const x = ((OFFICE_LOCATION.longitude + 180) / 360) * worldSize;
  const y = (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * worldSize;

  return {
    left: `${((x - MAP.originX) / MAP.width) * 100}%`,
    top: `${((y - MAP.originY) / MAP.height) * 100}%`,
  };
}
