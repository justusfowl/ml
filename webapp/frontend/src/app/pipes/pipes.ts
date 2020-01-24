import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'trimLongStr'})

export class TrimLongStr implements PipeTransform {
  transform(str: string, numChars): string {
    if (typeof(numChars) == "undefined"){
      numChars = 200; 
    }
    
    if (str.length > numChars){
        const takeFirst1 = str.substring(0,numChars) + "...";
        return takeFirst1;
    }else{
        return str; 
    }

  }
}

@Pipe({
  name: 'logFilter',
  pure: false
})
export class LogFilterPipe implements PipeTransform {
  transform(items: any[], filter: any): any {
      if (!items || !filter) {
          return items;
      }

      if (filter._id == ""){
        return items;
      }
      // filter items array, items which match and return true will be
      // kept, false will be filtered out

      let result = []; //  items.filter((item : any) => item._id == filter.objId);


      items.forEach(x => {
        if (x._id == filter._id){
          result.push(x)
        }
      });

      return result;
  }
}