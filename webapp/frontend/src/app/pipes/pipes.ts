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