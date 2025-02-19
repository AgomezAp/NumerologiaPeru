import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
} from '@angular/router';

import * as CryptoJS from 'crypto-js';
import Swal from 'sweetalert2';

import { DataService } from '../../services/data.service';
import { ParticlesComponent } from '../../shared/particles/particles.component';

@Component({
  selector: 'app-result',
  imports: [CommonModule, ParticlesComponent, FormsModule],
  templateUrl: './result.component.html',
  styleUrl: './result.component.css',
  animations: [
    trigger('fadeIn', [
      state('void', style({ opacity: 0 })),
      transition(':enter', [animate('1s ease-in', style({ opacity: 1 }))]),
    ]),
  ],
})
export class ResultComponent implements OnInit {
  selectedCards: { src: string; number: number; descriptions: string[], specificDescription: string }[] = [];
  luckyDescription!: string;
  luckyNumbers!: string;
  countryCode: string = '';
  phone: string = '';
  nombreCliente: string = '';
  isPaid: boolean = false;
  showPopupFlag: boolean = false;
  private encryptionKey = 'U0qQ0TGufDDJqCNvQS0b795q8EZPAp9E';
  hoveredDescription: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private dataService: DataService
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as {
      selectedCards: {
        src: string;
        number: number;
        descriptions: string[];
        specificDescription: string;
      }[];
      luckyDescription: string;
      luckyNumbers: string;
    };

    if (state) {
      this.selectedCards = state.selectedCards;
      this.luckyDescription = state.luckyDescription;
      this.luckyNumbers = state.luckyNumbers;

    }
  }

  ngOnInit(): void {

    setTimeout(() => {
      if (!this.isPaid) {
        this.showSweetAlert();
      }
    }, 1500);

    this.route.queryParams.subscribe((params: any) => {
      if (params['collection_status'] === 'approved') {
        this.isPaid = true;
        const encryptedData = localStorage.getItem('paymentData');
        if (encryptedData) {
          try {
            const bytes = CryptoJS.AES.decrypt(
              encryptedData,
              this.encryptionKey
            );
            const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
            this.selectedCards = decryptedData.selectedCards || [];
            this.luckyDescription = decryptedData.luckyDescription || '';
            this.luckyNumbers = decryptedData.luckyNumbers || '';
          } catch (e) {
            console.error('Error al desencriptar los datos:', e);
          }
        }
      }
    });
  }
  showSweetAlert(): void {
    Swal.fire({
      title: 'Para ver el contenido',
      text: 'Realiza una pequeña contribución, para ver lo que las cartas y los astros tienen para ti.',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Realizar Pago',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.makePayment();
      }
    });
  }

  showPopup(): void {
    this.showPopupFlag = true;
  }

  closePopup(): void {
    this.showPopupFlag = false;
  }

  submitPhone(): void {
    const errorMessage = document.getElementById('errorMessage');
    const numErrorMessage = document.getElementById('numErrorMessage');

    if (isNaN(Number(this.phone))) {
      numErrorMessage?.classList.add('show');
      numErrorMessage?.classList.remove('none');
      return;
    } else {
      numErrorMessage?.classList.remove('show');
      numErrorMessage?.classList.add('none');
    }

    if (!this.countryCode) {
      errorMessage?.classList.add('show');
      errorMessage?.classList.remove('none');
      return;
    } else {
      errorMessage?.classList.remove('show');
      errorMessage?.classList.add('none');
    }

    if (this.phone) {
      document.getElementById('phoneContainer')?.classList.remove('show');
      setTimeout(() => {
        document.getElementById('phoneContainer')!.style.display = 'none';
        document.getElementById('thankYouMessage')!.style.display = 'block';
        document.getElementById('thankYouMessage')!.classList.add('show');
      }, 500);
    } else {
      alert('Por favor, ingresa tu número de teléfono.');
    }
    const nombreCliente = localStorage.getItem('nombreCliente') || '';

    const numeroCliente = `${this.countryCode}${this.phone}`;
    const numeroMaestro = '+573217374091';
    const Descripciones = `${this.luckyDescription}`;
    const datosMod = {
      sessionId: '1234',
      phoneNumberCliente: numeroCliente,
      phoneNumberMaestro: numeroMaestro,
      nombreDelCliente: nombreCliente,
      message: `Nueva consulta de ${nombreCliente} (${numeroCliente}): \n\n${Descripciones} \n\nPonte en contacto con el cliente:\n\nhttps://wa.me/${numeroCliente}`,
    };

    const url = 'https://gestor-de-mesajeria-via-whatsapp-g5hc.onrender.com/api/messages/CrearMensaje';
    this.http.post(url, datosMod).subscribe(
      (response) => {
        console.log('Respuesta del servidor:', response);
      },
      (error) => {
        console.error('Error al realizar el POST:', error);
      }
    );
    this.router.navigate(['/agradecimiento'])
  }
  // Simula el proceso de pago
  makePayment(): void {
    // Guardar los datos en el almacenamiento local
    const paymentData = {
      nombreCliente: this.dataService.getFormData().nombreCliente,
      selectedCards: this.selectedCards,
      luckyDescription: this.luckyDescription,
      luckyNumbers: this.luckyNumbers,
    };

    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(paymentData),
      this.encryptionKey
    ).toString();
    localStorage.setItem('paymentData', encryptedData);

    this.http
      .post<{ id: string }>('http://localhost:3010/create-order', {})
      .subscribe((response) => {
        const paymentUrl = `https://www.mercadopago.com.pe/checkout/v1/redirect?preference-id=${response.id}`;
        window.location.href = paymentUrl;
      });
  }
  onCardMouseOver(specificDescription: string): void {
    this.hoveredDescription = specificDescription;
    console.log('Descripción específica:', specificDescription);
  }

  // Manejar el evento de quitar el cursor de una carta
  onCardMouseOut(): void {
    this.hoveredDescription = null;
  }
}
