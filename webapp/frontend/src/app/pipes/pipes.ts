import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'trimLongStr'})

export class TrimLongStr implements PipeTransform {
  transform(str: string): string {

    if (str.length > 200){
        const takeFirst1 = str.substring(0,200) + "...";
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