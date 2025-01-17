import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgTerminal, NgTerminalComponent } from 'ng-terminal';
import { DataService } from '../../data.service';
import { Observable, Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('term', { static: true }) child: NgTerminal;
  @ViewChild('searchinput') searchInput: ElementRef;

  pool_space: number = 0;
  estimate_win: any;
  rewards_blocks: any;
  rewards_amount: number = 0;
  farmers: any;
  netspace: number = 0;
  poolLog: string = '';
  xch_current_price: number = 0;
  pool_wallets: Array<any> = new Array();
  current_effort: number = 0;
  time_since_last_win: string = '';
  xch_tb_month: number = 0;
  average_effort: number = 0;

  searchNotFound: boolean = false;

  blocks$: Observable<any[]>;
  launchers$: Observable<any[]>;
  _launchers$: Subject<any[]> = new Subject<any[]>();
  log$: Observable<string>;
  payouts$: Observable<any[]>;
  searchSubscription: Subscription;

  leaderboard: Array<any> = new Array();

  farmersCollectionSize: number = 0;
  farmersPage: number = 1;
  farmersPageSize: number = 30;

  constructor(private dataService: DataService, private router: Router) {
    this.blocks$ = dataService.blocks$;
    this.launchers$ = this._launchers$.asObservable();
    this.log$ = dataService.log$;
    this.payouts$ = dataService.payouts$;
  }

  ngAfterViewInit() {
    this.log$.subscribe(
      (msg) => this.child.write(msg.split('\n').join('\r\n')),
    );
  }

  ngOnInit() {
    this.dataService.getStats().subscribe(data => {
      this.pool_space = data['pool_space'];
      this.estimate_win = data['estimate_win'];
      this.rewards_blocks = data['rewards_blocks'];
      this.rewards_amount = data['rewards_amount'];
      this.farmers = data['farmers'];
      this.netspace = data['blockchain_space'];
      this.xch_current_price = data['xch_current_price'];
      this.pool_wallets = data['pool_wallets'];
      this.current_effort = (data['time_since_last_win'] / (data['estimate_win'] * 60)) * 100;
      this.time_since_last_win = this.secondsToHm(data['time_since_last_win']);
      this.xch_tb_month = data['xch_tb_month'];
      this.average_effort = data['average_effort'];
    });
    this.dataService.getBlocks();
    this.dataService.getLaunchers({ limit: this.farmersPageSize }).subscribe(this.handleLaunchers.bind(this));
    this.dataService.getPayouts();

    this.dataService.connectLog();
    this.searchSubscription = this.launchers$.subscribe((data) => { this._handleSearch(data); });

  }

  private secondsToHm(d: number) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);

    var hDisplay = h > 0 ? h + "h" : "";
    var mDisplay = m > 0 ? m + "m" : "";
    return hDisplay + " " + mDisplay;
  }

  private _handleSearch(data) {
    if(data.length == 0) {
      if(this.searchInput?.nativeElement.value?.length > 0)
        this.searchNotFound = true;
    } else if(data.length == 1) {
      this.router.navigate(['/explorer/farmer', data[0]['launcher_id']]);
    }
  }

  private handleLaunchers(data) {
    if(this.leaderboard.length == 0) {
      this.leaderboard = data['results'].slice(0, 3);
    }
    this.farmersCollectionSize = data['count'];
    this._launchers$.next(data['results']);
  }

  searchFarmer() {
    this.searchNotFound = false;
    this.farmersPage = 1;
    this.dataService.getLaunchers({ search: this.searchInput.nativeElement.value, limit: this.farmersPageSize, offset: (this.farmersPage - 1) * this.farmersPageSize }).subscribe(this.handleLaunchers.bind(this));
  }

  refreshFarmers() {
    this.dataService.getLaunchers({ search: this.searchInput.nativeElement.value, offset: (this.farmersPage - 1) * this.farmersPageSize, limit: this.farmersPageSize }).subscribe(this.handleLaunchers.bind(this));
  }

  ngOnDestroy() {
    this.dataService.disconnectLog();
    this.searchSubscription.unsubscribe();
  }

}
