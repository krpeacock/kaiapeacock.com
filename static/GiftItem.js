// Custom Html Element: <gift-item></gift-item>

import("./checkbox.js");

class GiftItem extends HTMLElement {
  interval = null;

  pending = true;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
        <style>
            :host {
                width: calc(300px + 2rem);
                display: flex;
                border: 1px solid #acac;
                padding: 1.5rem 1rem;
                flex-direction: column;
                align-content: space-evenly;
                margin-bottom: 1rem;
            }
            h2 {
                margin: 0;
            }
            p {
                margin: 0;
                margin-bottom: 1rem;
            }
            .price-container {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                flex-wrap: wrap;
            }
            .original-price {
                text-decoration: line-through;
                color: #666;
                font-size: 0.9em;
            }
            .current-price {
                font-weight: bold;
                color: #d32f2f;
            }
            #picture-link {
                text-decoration: none;
                border-ottom: none;
            }
            picture {
                display: flex;
                justify-content: center;
                aspect-ratio: 1;
                width: 100%;
                align-items: center;
                align-content: center;
            }
            picture img {
                background: white;
                backgroundBlendMode: normal;
                width: 100%;
                aspect-ratio: 1;
                object-fit: contain;
                margin-bottom: 0;
            }
            #link {
                margin-top: auto;
            }
            #reserved-label {
                background: none;
                border: none;
                padding: 0.25rem;
                width: fit-content;
                display: flex;
                align-items: center;
                margin-top: 1rem;
            }
            #reserved-label::focus-within {
                outline: 1px solid #ededf0
            }
        </style>
        <a id="picture-link" href="">
            <picture>
                <img src="" alt="" />
            </picture>
        </a>
        <h3 id="title"></h3>
        <p id="description"></p>
        <div id="price-container" class="price-container" style="display: none;"></div>
        <a href="" id="link"></a>
        `;
  }

  connectedCallback() {
    this.shadowRoot.querySelector("#picture-link").href =
      this.getAttribute("link");
    this.shadowRoot.querySelector("img").src = this.getAttribute("image");
    this.shadowRoot.querySelector("img").alt = this.getAttribute("alt");
    this.shadowRoot.querySelector("h3").textContent =
      this.getAttribute("title");

    const priceContainer = this.shadowRoot.querySelector("#price-container");
    const originalPrice = this.getAttribute("originalPrice");
    const currentPrice = this.getAttribute("price");

    // Format prices
    const priceFormatter = Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

    // Build description
    let description = this.getAttribute("description");
    
    // Handle pricing display
    if (currentPrice) {
      const formattedCurrent = priceFormatter.format(currentPrice);
      
      if (originalPrice && parseFloat(originalPrice) > parseFloat(currentPrice)) {
        // Show discount pricing with strikethrough in price container
        const formattedOriginal = priceFormatter.format(originalPrice);
        
        priceContainer.style.display = "flex";
        priceContainer.innerHTML = `
          <span class="original-price">${formattedOriginal}</span>
          <span class="current-price">${formattedCurrent}</span>
        `;
        // Also show current price in description for consistency
        description += ` - ${formattedCurrent}`;
      } else {
        // Show regular price in description only
        priceContainer.style.display = "none";
        description += ` - ${formattedCurrent}`;
      }
    }

    this.shadowRoot.querySelector("#description").textContent = description;

    this.shadowRoot.querySelector("#link").textContent =
      this.getAttribute("linktext");
    this.shadowRoot.querySelector("#link").href = this.getAttribute("link");

    // Checkbox for reserved status
    const label = document.createElement("button");
    label.id = "reserved-label";
    this.shadowRoot.appendChild(label);
    const checkbox = document.createElement("paper-checkbox");
    checkbox.setAttribute("disabled", "");
    label.addEventListener("click", async () => {
      checkbox.setAttribute("disabled", "");
      this.pending = true;

      this.interval = clearInterval(this.interval);
      const response = await fetch(
        `https://eoexx-syaaa-aaaab-qahzq-cai.icp0.io/gifts/${this.id}/toggle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const json = await response.json();
        const { status } = json;
        this.updateCheckbox(status);
        this.pollStatus();
      }
    });
    label.appendChild(checkbox);
    const span = document.createElement("span");
    span.textContent = "Reserved";
    label.appendChild(span);

    this.status().then(() => {
      this.pending = false;
    });
  }

  static get observedAttributes() {
    return [
      "title",
      "description",
      "price",
      "originalPrice",
      "image",
      "alt",
      "link",
      "linktext",
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      switch (name) {
        case "title":
          this.shadowRoot.querySelector("h3").textContent = newValue;
          break;
        case "description":
          this.shadowRoot.querySelector("p").textContent = newValue;
          break;
        case "price":
        case "originalPrice":
          // Rebuild price display when price attributes change
          const priceContainer = this.shadowRoot.querySelector("#price-container");
          const origPrice = this.getAttribute("originalPrice");
          const currPrice = this.getAttribute("price");
          
          const priceFormatter = Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          });
          
          let desc = this.getAttribute("description");
          
          if (currPrice) {
            if (origPrice && parseFloat(origPrice) > parseFloat(currPrice)) {
              const formattedOriginal = priceFormatter.format(origPrice);
              const formattedCurrent = priceFormatter.format(currPrice);
              
              priceContainer.style.display = "flex";
              priceContainer.innerHTML = `
                <span class="original-price">${formattedOriginal}</span>
                <span class="current-price">${formattedCurrent}</span>
              `;
              // Also show current price in description for consistency
              desc += ` - ${formattedCurrent}`;
            } else {
              priceContainer.style.display = "none";
              const formattedCurrent = priceFormatter.format(currPrice);
              desc += ` - ${formattedCurrent}`;
            }
          }
          
          this.shadowRoot.querySelector("#description").textContent = desc;
          break;
        case "image":
          this.shadowRoot.querySelector("img").src = newValue;
          break;
        case "alt":
          this.shadowRoot.querySelector("img").alt = newValue;
          break;
        case "link":
          this.shadowRoot.querySelector("#link").href = newValue;
          break;
        case "linktext":
          this.shadowRoot.querySelector("#link").textContent = newValue;
          break;
      }
    }
  }

  pollStatus() {
    this.interval = setInterval(() => {
      if (!this.pending) {
        this.status();
      }
    }, 10000);
  }

  async status() {
    return await fetch(
      `https://eoexx-syaaa-aaaab-qahzq-cai.icp0.io/gifts/${this.id}`
    ).then(async (response) => {
      if (response.ok) {
        const json = await response.json();
        const { status } = json;
        this.updateCheckbox(status);

        return response;
      }
      throw new Error("Network response was not ok.");
    });
  }

  /**
   *
   * @param {"bought" | "ubought"} state
   */
  updateCheckbox(state) {
    // ensure the state is valid
    if (!["bought", "unbought"].includes(state)) {
      throw new Error("Invalid checkbox state");
    }

    const checkbox = this.shadowRoot.querySelector("paper-checkbox");

    switch (state) {
      case "bought":
        if (!checkbox.hasAttribute("checked")) {
          checkbox.setAttribute("checked", "");
        }
        break;
      case "unbought":
        if (checkbox.hasAttribute("checked")) {
          checkbox.removeAttribute("checked");
        }
        break;
    }
    checkbox.removeAttribute("disabled");
    this.pending = false;
  }
}

customElements.define("gift-item", GiftItem);
