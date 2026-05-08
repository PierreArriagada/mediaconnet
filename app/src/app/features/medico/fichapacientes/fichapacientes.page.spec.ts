import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { FichapacientesPage } from './fichapacientes.page';

describe('FichapacientesPage', () => {
  let component: FichapacientesPage;
  let fixture: ComponentFixture<FichapacientesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FichapacientesPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FichapacientesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
