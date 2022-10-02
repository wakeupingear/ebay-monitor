# NO LONGER NEED THIS KAJFLKSDJFLKASJDLKF

import datetime
import json
import copy
from ebaysdk.exception import ConnectionError
from ebaysdk.finding import Connection

foundItems = []

def search(query, infoData):
    fields = copy.deepcopy(query)
    fields.pop("query")
    print(fields)

    try:
        api = Connection(domain='svcs.sandbox.ebay.com',appid='WillFarh-Trackera-SBX-48bd95033-2598889a', config_file=None)
        response = api.execute('findItemsAdvanced', {'keywords': query["query"], **fields})

        assert(response.reply.ack == 'Success')
        assert(type(response.reply.timestamp) == datetime.datetime)
        assert(type(response.reply.searchResult.item) == list)

        for i in range(min(infoData["searchDepth"], len(response.reply.searchResult.item))):
            item = response.reply.searchResult.item[i]
            foundItems.append(item)

        item = response.reply.searchResult.item[0]
        assert(type(item.listingInfo.endTime) == datetime.datetime)
        assert(type(response.dict()) == dict)

    except ConnectionError as e:
        print(e)
        print(e.response.dict())

def main():
    info = open("info.json", "r")
    infoData = json.load(info)

    for query in infoData["queries"]:
        search(query, infoData)
    
    for item in foundItems:
        print(item)


if __name__ == "__main__":
    main()