import { query } from "entitystorage";
import DataType from "../../../models/datatype.mjs";

export function generateChangelog(thread, history) {
  let foundCreation = true;
  let result = (history || thread.history);
  result = result.sort((a, b) => a.ts < b.ts ? -1 : 1);
  result = result.map(h => {
    let typeName = h.data?.type
    let typeText = "UNKNOWN"
    let valueFrom = undefined;
    let valueTo = undefined;
    let ref = undefined;
    let text = h.data?.text || null
    let fieldName = undefined;
    let relatedTypeName = undefined;

    switch (h.type) {
      case "tag":
        /* 
        if (h.data.tag == "closed") {
          typeName = 'changed-status';
          typeText = "Changed status";
          valueFrom = h.data.operation == "add" ? "New" : "Closed";
          valueTo = h.data.operation == "add" ? "Closed" : "New";
          text = h.data.operation == "add" ? "Closed" : "Reopened";
        } else if (h.data.tag == "2009" || h.data.tag == "2012" || h.data.tag == "D365") {
          typeName = h.data.operation == "add" ? 'enabled-version' : 'disabled-version';
          typeText = h.data.operation == "add" ? 'Enabled version' : 'Disabled version';
          valueFrom = h.data.operation == "add" ? false : true;
          valueTo = h.data.operation == "add" ? true : false;
          text = h.data.tag;
          fieldName = h.data.tag
        } */
        break;

      case "prop":
        typeName = 'modified-field';
        typeText = "Modified";
        valueTo = h.data.value;
        text = `${h.data.prop} = ${h.data.value}`;
        fieldName = h.data.prop
        break;

      case "rel":
        let relatedEntity = query.id(h.data.id1 == thread._id ? h.data.id2 : h.data.id1).first;
        if (!relatedEntity) break;
        let relatedEntityType = DataType.lookupByEntity(relatedEntity);
        if (!relatedEntityType) {
          // console.log("No related entity type", relatedEntity.tags, relatedEntity.id, relatedEntity._id, relatedEntity)
          break;
        }

        typeName = h.data.operation.startsWith("add") ? 'added-relation' : "removed-relation";
        typeText = h.data.operation.startsWith("add") ? `Added relation ${h.data.rel}` : `Removed relation ${h.data.rel}`;
        ref = relatedEntity.id || relatedEntity._id
        text = `${relatedEntityType?.title}: ${relatedEntity?.name || ref}`;
        fieldName = h.data.rel
        relatedTypeName = relatedEntityType?.id
        break;

      case "enable":
        if (foundCreation) return null;
        typeName = 'created';
        typeText = "Created";
        text = "Created (or enabled history for) thread"
    }
    if (typeName == "created") foundCreation = true;
    return { type: h.type, typeName, typeText, timestamp: h.ts, text, valueFrom, valueTo, ref, fieldName, relatedTypeName, historyData: typeName ? undefined : h }
  });
  return result.filter(h => h != null && h.typeName)
}
