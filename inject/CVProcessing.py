import os
import darknetWrap as dn
from PIL import Image

class CVProcessor:

    def __init__(self):

        net, meta, names = dn.getNetInit(
            configPath=os.environ.get("DARKNET_CFG_PATH"),
            weightPath=os.environ.get("DARKNET_WEIGHTS_PATH"),
            metaPath=os.environ.get("DARKNET_DATA_PATH")
        )

        self.net = net
        self.meta = meta
        self.names = names

    def init_label_obj(self, obj):
        self.label_obj = obj

    def get_tbody(self, page_dict, flag_raw_detection=False):

        if "path" not in page_dict:
            raise ("No path provided for image of objId %s " % self.label_obj._id)

        img = Image.open(page_dict["path"])

        darklnet_detect = dn.performDetect(imagePath=page_dict["path"], net=self.net, meta=self.meta, names=self.names)

        if flag_raw_detection:
            return darklnet_detect
        else:
            if len(darklnet_detect) > 0:

                # @TODO: for simplicity, right now only one (and the first) TEXTBODY detection is considered the relevant bbox

                detection = darklnet_detect[0]

                bbox_coords = detection[2]

                x_mid = bbox_coords[0];
                y_mid = bbox_coords[1];
                bbox_width = bbox_coords[2];
                bbox_height = bbox_coords[3];

                img_size = img.size

                img_width = img_size[0]
                img_height = img_size[1]

                relWidth = bbox_width/img_width
                relHeight = bbox_height/img_height

                x1 = x_mid - bbox_width / 2
                y1 = y_mid - bbox_height / 2

                bbox = {
                    "origin" : "model",
                    "relWidth" : relWidth,
                    "relHeight" : relHeight,
                    "width": bbox_width,
                    "height": bbox_height,
                    "relX" : x1/img_width,
                    "relY": y1/img_height,
                    "x": x1,
                    "y": y1
                }

                return bbox

